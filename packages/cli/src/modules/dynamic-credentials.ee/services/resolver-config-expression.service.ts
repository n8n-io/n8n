import { CredentialResolverConfiguration } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { getAdditionalKeys } from 'n8n-core';
import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodeType,
	INodeTypeData,
	INodeTypes,
	IVersionedNodeType,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { NodeHelpers, UnexpectedError, Workflow } from 'n8n-workflow';

import { getBase } from '@/workflow-execute-additional-data';

/**
 * Service for resolving expressions in credential resolver configurations.
 * Provides both validation-time resolution (with mock values) and runtime resolution (with actual execution context).
 */
@Service()
export class ResolverConfigExpressionService {
	private readonly mockNode: INode;

	private readonly mockNodeTypes: INodeTypes;

	constructor() {
		// Mock node setup for expression resolution
		this.mockNode = {
			id: 'mock',
			name: '',
			typeVersion: 1,
			type: 'mock',
			position: [0, 0],
			parameters: {} as INodeParameters,
		};

		const mockNodesData: INodeTypeData = {
			mock: {
				sourcePath: '',
				type: {
					description: { properties: [] as INodeProperties[] },
				} as INodeType,
			},
		};

		this.mockNodeTypes = {
			getKnownTypes(): { [key: string]: { className: string; sourcePath: string } } {
				return {};
			},
			getByName(nodeType: string): INodeType | IVersionedNodeType {
				return mockNodesData[nodeType]?.type;
			},
			getByNameAndVersion(nodeType: string, version?: number): INodeType {
				if (!mockNodesData[nodeType]) {
					throw new UnexpectedError(`Node type "${nodeType}" not found`);
				}
				return NodeHelpers.getVersionedNodeType(mockNodesData[nodeType].type, version);
			},
		};
	}

	/**
	 * Resolves expressions in config for validation purposes.
	 * Uses mock/empty values to validate expression syntax during resolver creation/update.
	 * @throws Error if expression syntax is invalid
	 */
	async resolveForValidation(
		config: CredentialResolverConfiguration,
		canUseExternalSecrets = false,
	): Promise<CredentialResolverConfiguration> {
		const workflow = new Workflow({
			nodes: [this.mockNode],
			connections: {},
			active: false,
			nodeTypes: this.mockNodeTypes,
		});

		const additionalData = await getBase();
		const additionalKeys = getAdditionalKeys(additionalData, 'manual', null, {
			secretsEnabled: canUseExternalSecrets,
		});

		return workflow.expression.getComplexParameterValue(
			this.mockNode,
			config,
			'manual',
			additionalKeys,
			undefined,
			undefined,
			config,
		) as INodeParameters;
	}

	/**
	 * Resolves expressions in config for runtime execution.
	 * Uses actual execution context to resolve expressions to real values.
	 */
	resolveForRuntime(
		config: CredentialResolverConfiguration,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		canUseExternalSecrets: boolean,
	): CredentialResolverConfiguration {
		const workflow = new Workflow({
			nodes: [this.mockNode],
			connections: {},
			active: false,
			nodeTypes: this.mockNodeTypes,
		});

		const additionalKeys = getAdditionalKeys(additionalData, mode, null, {
			secretsEnabled: canUseExternalSecrets,
		});

		return workflow.expression.getComplexParameterValue(
			this.mockNode,
			config,
			mode,
			additionalKeys,
			undefined,
			undefined,
			config,
		) as INodeParameters;
	}
}
