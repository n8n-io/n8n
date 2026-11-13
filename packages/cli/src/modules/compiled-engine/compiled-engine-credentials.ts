import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { ExecuteContext } from 'n8n-core';
import type { IDataObject, IExecuteData, INode } from 'n8n-workflow';
import { createRunExecutionData, Workflow } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import type { CredentialSlotBinding } from './compiled-engine.types';
import { loadWorkflowLang } from './workflow-lang';

function toExecuteData(nodeType: string): IExecuteData {
	return {
		node: { id: '', name: '', type: nodeType, typeVersion: 0, position: [0, 0], parameters: {} },
		data: {},
		source: null,
	};
}

/**
 * Builds the credentials document of spec section 7 for `wfrt`. It decrypts
 * each credential through n8n's credentials helper and derives `inject` from
 * the credential type with `@n8n/workflow-lang`. The document stays in
 * memory; n8n sends it to `wfrt` and never writes it to disk.
 */
@Service()
export class CompiledEngineCredentials {
	constructor(
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialTypes: CredentialTypes,
		private readonly nodeTypes: NodeTypes,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('compiled-engine');
	}

	/** Builds the credentials document of one workflow from its slot bindings. */
	async buildDocument(
		workflowId: string,
		slots: CredentialSlotBinding[],
	): Promise<Record<string, unknown>> {
		const lang = await loadWorkflowLang();
		const registry: Parameters<typeof lang.buildCredentialsFile>[0]['registry'] = {
			get: (name) => {
				if (!this.credentialTypes.recognizes(name)) return undefined;
				return lang.describeCredentialType(this.credentialTypes.getByName(name));
			},
			names: () => [],
		};

		const document: Record<string, unknown> = {};
		for (const use of slots) {
			if (!use.credentialId) {
				this.logger.warn(`Credential slot "${use.slot}" has no credential`, { workflowId });
				continue;
			}
			try {
				const additionalData = await WorkflowExecuteAdditionalData.getBase({
					workflowId,
				});
				const data = await this.credentialsHelper.getDecrypted(
					additionalData,
					{ id: use.credentialId, name: use.credentialName },
					use.type,
					'internal',
					toExecuteData(use.type),
				);
				const { file } = lang.buildCredentialsFile({
					exported: [
						{ id: use.credentialId, name: use.credentialName, type: use.type, data: { ...data } },
					],
					slots: [{ slot: use.slot, type: use.type }],
					mappings: new Map([[use.slot, use.credentialId]]),
					registry,
				});
				Object.assign(document, file);
			} catch (error) {
				this.logger.warn(`Could not prepare credential slot "${use.slot}"`, {
					workflowId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		return document;
	}

	/** Saves the OAuth token data that a v1 node refreshed, as `CredentialsHelper` does. */
	async updateOAuthTokenData(
		binding: CredentialSlotBinding,
		oauthTokenData: IDataObject,
		workflowId: string,
	): Promise<void> {
		if (!binding.credentialId) {
			throw new UserError(`The credential slot "${binding.slot}" has no credential`);
		}
		const additionalData = await WorkflowExecuteAdditionalData.getBase({ workflowId });
		await this.credentialsHelper.updateCredentialsOauthTokenData(
			{ id: binding.credentialId, name: binding.credentialName },
			binding.type,
			{ oauthTokenData },
			additionalData,
		);
	}

	/**
	 * Refreshes the access token with n8n-core's OAuth2 code, which also saves
	 * it through `CredentialsHelper.updateCredentialsOauthTokenData`.
	 */
	async refreshOAuth2(binding: CredentialSlotBinding, workflowId: string): Promise<void> {
		if (!binding.credentialId) {
			throw new UserError(`The credential slot "${binding.slot}" has no credential`);
		}
		const context = await this.refreshContext(binding, workflowId);
		await context.helpers.refreshOAuth2Token.call(context, binding.type);
	}

	/**
	 * A context that only refreshes the token. HTTP Request has full access to
	 * credentials, so the context does not need the node type of the caller.
	 */
	private async refreshContext(
		binding: CredentialSlotBinding,
		workflowId: string,
	): Promise<ExecuteContext> {
		const node: INode = {
			id: 'compiled-engine-credential-refresh',
			name: 'Compiled engine credential refresh',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [0, 0],
			parameters: {},
			credentials: {
				[binding.type]: { id: binding.credentialId, name: binding.credentialName },
			},
		};
		const workflow = new Workflow({
			id: workflowId,
			name: workflowId,
			nodes: [node],
			connections: {},
			nodeTypes: this.nodeTypes,
			active: false,
		});
		const additionalData = await WorkflowExecuteAdditionalData.getBase({ workflowId });
		return new ExecuteContext(
			workflow,
			node,
			additionalData,
			'internal',
			createRunExecutionData(),
			0,
			[],
			{},
			{ node, data: {}, source: null },
			[],
		);
	}
}
