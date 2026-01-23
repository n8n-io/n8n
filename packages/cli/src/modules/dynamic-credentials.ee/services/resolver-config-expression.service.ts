import { CredentialResolverConfiguration } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { getNonWorkflowAdditionalKeys } from 'n8n-core';
import type { INode, INodeParameters } from 'n8n-workflow';
import { isNodeParameters, Workflow } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { getBase } from '@/workflow-execute-additional-data';

/**
 * Service for resolving expressions in credential resolver configurations.
 * Uses global data only (secrets, variables) without runtime execution context.
 */
@Service()
export class ResolverConfigExpressionService {
	constructor(private readonly nodeTypes: NodeTypes) {}

	/**
	 * Resolves expressions in config using global data only (secrets, variables).
	 * Does not use runtime execution context or workflow data.
	 * @throws Error if expression syntax is invalid
	 */
	async resolve(
		config: CredentialResolverConfiguration,
		canUseExternalSecrets = false,
	): Promise<CredentialResolverConfiguration> {
		// If config is not INodeParameters, return as is
		if (!isNodeParameters(config)) {
			return config;
		}

		// Create a minimal workflow with the mock node to leverage the expression resolver
		const workflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});

		const additionalData = await getBase();
		const additionalKeys = getNonWorkflowAdditionalKeys(additionalData, {
			secretsEnabled: canUseExternalSecrets,
		});

		return workflow.expression.getComplexParameterValue(
			// Use a mock node (mandatory) to resolve expressions in the config
			{
				id: '1',
				name: 'Mock Node',
			} as INode,
			config,
			'manual',
			additionalKeys,
			undefined,
			undefined,
			config,
		) as INodeParameters;
	}
}
