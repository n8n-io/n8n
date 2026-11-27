import { createZodSchemaFromArgs, extractFromAIParameters } from '@n8n/ai-utilities/fromai-helpers';
import type {
	AgentJsonNodeToolConfig,
	AppDescribedNodeOperationBinding,
	AppJsonSchema,
	AppNodeOperationBinding,
} from '@n8n/api-types';
import { CredentialsFinderService } from '@n8n/backend-services';
import { AppNodeOperationPort } from '@n8n/backend-module-apps';
import { CredentialsRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { isRecord } from '@n8n/utils/is-record';
import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
	findHttpRequestToolUrlFromAiViolations,
	validateNodeToolConfigs,
	validateNodeToolExpressions,
} from '@/modules/agents/utils/node-tool-validation';
import { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import { resolveToolNodeType } from '@/node-execution/resolve-tool-node-type';
import { NodeTypes } from '@/node-types';

/** The same shape as an agent node tool, so the binding reuses the node tool checks. */
function asNodeTool(binding: AppNodeOperationBinding): AgentJsonNodeToolConfig {
	return { type: 'node', name: binding.key, node: binding.node };
}

/** For example "Google Calendar: Availability". Falls back to the node name. */
function displayName(description: INodeTypeDescription, parameters: INodeParameters): string {
	const { operation } = parameters;
	const option = description.properties
		.filter((property) => property.name === 'operation')
		.flatMap((property) => property.options ?? [])
		.find((candidate) => 'value' in candidate && candidate.value === operation);
	return option ? `${description.displayName}: ${option.name}` : description.displayName;
}

/**
 * Node operations for app bindings. The binding fixes the node and its credentials.
 * The app sets only the `$fromAI` inputs, so a visitor cannot change what the node does.
 */
@Service()
export class AppNodeOperationAdapter extends AppNodeOperationPort {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly executor: EphemeralNodeExecutor,
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly credentialsRepository: CredentialsRepository,
	) {
		super();
	}

	async assertCanBind(user: User, projectId: string, binding: AppNodeOperationBinding) {
		const { key, node } = binding;
		const fail = (reason: string) => new BadRequestError(`Binding "${key}": ${reason}`);

		try {
			this.executor.validateNodeForExecution(
				resolveToolNodeType(node.nodeType, node.nodeTypeVersion),
				node.nodeTypeVersion,
				node.nodeParameters as INodeParameters,
			);
			validateNodeToolExpressions([asNodeTool(binding)]);
		} catch (error) {
			throw fail(getErrorMessage(error));
		}
		if (findHttpRequestToolUrlFromAiViolations([asNodeTool(binding)]).length > 0) {
			throw fail('the app cannot set the URL of an HTTP Request node. Use a fixed URL.');
		}
		const invalid = await validateNodeToolConfigs([asNodeTool(binding)]);
		if (invalid) throw fail(invalid);

		for (const [credentialType, { id }] of Object.entries(node.credentials ?? {})) {
			// Every visitor uses this credential, so the person who binds it must be able to read it.
			const credential = await this.credentialsFinder.findCredentialForUser(id, user, [
				'credential:read',
			]);
			if (!credential || !(await this.isUsableInProject(projectId, credentialType, id))) {
				throw new NotFoundError(
					`Binding "${key}": the "${credentialType}" credential is not in the app project, or you cannot use it.`,
				);
			}
			// Support for end-user credentials in node operations comes later.
			if (credential.isResolvable) {
				throw fail(`"${credential.name}" is an end-user credential. Use a fixed credential.`);
			}
		}
	}

	async describe(
		projectId: string,
		binding: AppNodeOperationBinding,
	): Promise<AppDescribedNodeOperationBinding | null> {
		const { node } = binding;
		let description: INodeTypeDescription;
		try {
			description = this.nodeTypes.getByNameAndVersion(
				node.nodeType,
				node.nodeTypeVersion,
			).description;
		} catch {
			return null;
		}
		for (const [credentialType, { id }] of Object.entries(node.credentials ?? {})) {
			if (!(await this.isUsableInProject(projectId, credentialType, id))) return null;
		}
		return {
			...binding,
			name: displayName(description, node.nodeParameters as INodeParameters),
			input: this.inputJsonSchema(node.nodeParameters as INodeParameters),
		};
	}

	private async isUsableInProject(projectId: string, credentialType: string, id: string) {
		const [credential] = await this.credentialsRepository.findCredentialsUsableInProject(
			projectId,
			[id],
		);
		return credential?.type === credentialType;
	}

	private inputJsonSchema(parameters: INodeParameters): AppJsonSchema {
		let generated: unknown;
		try {
			generated = zodToJsonSchema(createZodSchemaFromArgs(extractFromAIParameters(parameters)));
		} catch {
			// A malformed `$fromAI` call fails `assertCanBind`. Describe it as an input-free node.
			generated = undefined;
		}
		if (!isRecord(generated))
			return { type: 'object', properties: {}, additionalProperties: false };
		const { type, properties, required } = generated;
		return { type, properties, ...(required ? { required } : {}), additionalProperties: false };
	}
}
