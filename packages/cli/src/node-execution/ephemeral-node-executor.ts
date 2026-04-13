import { Logger } from '@n8n/backend-common';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ExecuteContext } from 'n8n-core';
import type {
	IExecuteData,
	INode,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeParameters,
	ITaskDataConnections,
	NodeOutput,
} from 'n8n-workflow';
import {
	Workflow,
	Node,
	UserError,
	createEmptyRunExecutionData,
	SEND_AND_WAIT_OPERATION,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { NodeTypes } from '@/node-types';
import { getBase } from '@/workflow-execute-additional-data';

/** Minimal tool shape for constructing an in-memory single-node execution. */
export type EphemeralWorkflowToolLike = {
	projectId: string;
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters: INodeParameters;
	credentials?: Record<string, INodeCredentialsDetails> | null;
};

export interface InlineNodeExecutionRequest {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters: INodeParameters;
	/** Credential type name → credential instance display name (resolved at execution). */
	credentials?: Record<string, string>;
	/**
	 * Pre-resolved credential ids (e.g. from ToolFromNode which has { id, name } from list_credentials).
	 */
	credentialDetails?: Record<string, INodeCredentialsDetails>;
	inputData: INodeExecutionData[];
	projectId: string;
}

export interface NodeExecutionResult {
	status: 'success' | 'error';
	data: INodeExecutionData[];
	error?: string;
}

// send and wait requires persistent workflows to handle the wait logic
const OPERATION_BLACKLIST = [SEND_AND_WAIT_OPERATION, 'dispatchAndWait'];

@Service()
export class EphemeralNodeExecutor {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Resolve credential type + display name to IDs for workflow execution,
	 * scoped to the project's accessible credentials.
	 */
	private async resolveInlineCredentials(
		projectId: string,
		credentials?: Record<string, string>,
	): Promise<Record<string, INodeCredentialsDetails> | null> {
		if (!credentials || Object.keys(credentials).length === 0) {
			return null;
		}

		const accessible = await this.credentialsRepository.findAllCredentialsForProject(projectId);

		const resolved: Record<string, INodeCredentialsDetails> = {};

		for (const [credType, credName] of Object.entries(credentials)) {
			const matches = accessible.filter(
				(c) => c.type === credType && c.name.toLowerCase() === credName.toLowerCase(),
			);

			if (matches.length === 0) {
				throw new UserError(
					`No accessible credential found for type "${credType}" with name "${credName}"`,
					{ extra: { credType, credName } },
				);
			}

			if (matches.length > 1) {
				throw new UserError(
					`Multiple credentials match type "${credType}" with name "${credName}". Use a unique credential name.`,
					{ extra: { credType, credName } },
				);
			}

			const entity = matches[0];
			resolved[credType] = { id: entity.id, name: entity.name };
		}

		return resolved;
	}

	private async verifyCredentialDetailsForProject(
		projectId: string,
		details: Record<string, INodeCredentialsDetails>,
	): Promise<Record<string, INodeCredentialsDetails>> {
		const verified: Record<string, INodeCredentialsDetails> = {};

		for (const [credType, d] of Object.entries(details)) {
			if (!d.id) {
				throw new UserError(
					`Credential reference for "${credType}" is missing an id (required for execution).`,
					{ extra: { credType, name: d.name } },
				);
			}

			const sharedCredential = await this.sharedCredentialsRepository.findOne({
				where: { credentialsId: d.id, projectId },
				relations: { credentials: true },
			});

			if (!sharedCredential) {
				throw new UserError(`Credential "${d.name}" is not accessible or does not exist.`, {
					extra: { credType, credentialId: d.id },
				});
			}

			if (sharedCredential.credentials.type !== credType) {
				throw new UserError(
					`Credential "${sharedCredential.credentials.name}" has type "${sharedCredential.credentials.type}" but the node expects credential slot "${credType}".`,
					{
						extra: {
							credType,
							actualType: sharedCredential.credentials.type,
							credentialId: d.id,
						},
					},
				);
			}

			verified[credType] = {
				id: sharedCredential.credentials.id,
				name: sharedCredential.credentials.name,
			};
		}

		return verified;
	}

	private validateNodeForExecution(
		nodeType: string,
		typeVersion: number,
		nodeParameters: INodeParameters,
	): void {
		const resolved = this.nodeTypes.getByNameAndVersion(nodeType, typeVersion);

		if (!resolved.description.usableAsTool) {
			throw new UserError('Node is not usable as a tool', { extra: { nodeType } });
		}

		if (resolved.description.group.includes('trigger')) {
			throw new UserError('Trigger nodes cannot be executed standalone', { extra: { nodeType } });
		}

		const operation = nodeParameters.operation;

		if (operation && typeof operation === 'string' && OPERATION_BLACKLIST.includes(operation)) {
			throw new UserError(`The "${operation}" is not supported for agent tool execution.`, {
				extra: { nodeType, operation },
			});
		}
	}

	/**
	 * Execute a node directly without persisting a workflow or execution to the DB.
	 * Mirrors the pattern from WorkflowExecute.executeNode and DynamicNodeParametersService.
	 */
	private async executeNodeDirectly(
		tool: EphemeralWorkflowToolLike,
		inputItems: INodeExecutionData[],
	): Promise<NodeExecutionResult> {
		const node: INode = {
			id: uuid(),
			name: 'Target Node',
			type: tool.nodeType,
			typeVersion: tool.nodeTypeVersion,
			position: [0, 0],
			parameters: tool.nodeParameters,
			credentials: tool.credentials ?? undefined,
		};

		const workflow = new Workflow({
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});

		const additionalData = await getBase({ projectId: tool.projectId });

		const runExecutionData = createEmptyRunExecutionData();
		const mode = 'internal' as const;
		const runIndex = 0;
		const connectionInputData = inputItems;

		const inputData: ITaskDataConnections = {
			main: [inputItems],
		};

		const executeData: IExecuteData = {
			node,
			data: inputData,
			source: null,
		};

		const context = new ExecuteContext(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executeData,
			[],
		);

		const nodeType = this.nodeTypes.getByNameAndVersion(tool.nodeType, tool.nodeTypeVersion);

		if (!nodeType.execute) {
			return { status: 'error', data: [], error: 'Node type does not have an execute method' };
		}

		let output: NodeOutput;
		try {
			output =
				nodeType instanceof Node
					? await nodeType.execute(context)
					: await nodeType.execute.call(context);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.debug('Node execution failed', { nodeType: tool.nodeType, error: message });
			return { status: 'error', data: [], error: message };
		}

		if (!Array.isArray(output) || !output[0]) {
			return { status: 'error', data: [], error: 'No output data' };
		}
		return { status: 'success', data: output[0] };
	}

	async executeInline(request: InlineNodeExecutionRequest): Promise<NodeExecutionResult> {
		this.validateNodeForExecution(
			request.nodeType,
			request.nodeTypeVersion,
			request.nodeParameters,
		);

		const fromNames =
			(await this.resolveInlineCredentials(request.projectId, request.credentials)) ?? {};

		let fromDetails: Record<string, INodeCredentialsDetails> = {};
		if (request.credentialDetails && Object.keys(request.credentialDetails).length > 0) {
			fromDetails = await this.verifyCredentialDetailsForProject(
				request.projectId,
				request.credentialDetails,
			);
		}

		const mergedCredentials =
			Object.keys(fromNames).length === 0 && Object.keys(fromDetails).length === 0
				? null
				: { ...fromNames, ...fromDetails };

		const tool: EphemeralWorkflowToolLike = {
			projectId: request.projectId,
			nodeType: request.nodeType,
			nodeTypeVersion: request.nodeTypeVersion,
			nodeParameters: request.nodeParameters,
			credentials: mergedCredentials,
		};
		// TODO: for nodes with send and wait operations implement persistent workflows to handle the wait logic
		return await this.executeNodeDirectly(tool, request.inputData);
	}
}
