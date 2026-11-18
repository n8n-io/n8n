import { OutboundHttp } from '@n8n/backend-network';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject, WorkflowExecuteMode } from 'n8n-workflow';

import { VaultCredentialsConfig } from './vault-credentials.config';
import { VaultWorkflowDefinitionService } from './vault-workflow-definition.service';

const MAX_RESPONSE_BYTES = 1_000_000;

export interface VaultReferenceData extends ICredentialDataDecryptedObject {
	$vault: string;
}

interface ResolveInput {
	credentialId: string;
	/** Only for the log, so a person can match the lines to what they see in the editor. */
	credentialName?: string;
	nodeName?: string;
	data: VaultReferenceData;
	workflowId: string | undefined;
	executionId: string | undefined;
	mode: WorkflowExecuteMode;
	/** Called with a plain sentence for each step. It never gets a secret. */
	onStep?: (text: string) => void;
}

const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : 'unknown');

interface BrokerTokenBody {
	wrapToken?: string;
	reason?: string;
}

interface UnwrappedSecret {
	data?: { data?: { value?: unknown } };
}

/**
 * Swaps a vault reference for the real credential data.
 *
 * The credential row holds only a reference. The secret comes from a vault at run time, through a
 * broker that checks an admin-signed grant against the workflow definition. The broker returns a
 * single-use token, and n8n unwraps it directly against the vault. Every failure stops the run.
 */
@Service()
export class VaultCredentialResolver {
	constructor(
		private readonly config: VaultCredentialsConfig,
		private readonly outboundHttp: OutboundHttp,
		private readonly definitions: VaultWorkflowDefinitionService,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('vault-credentials');
	}

	isVaultReference(data: ICredentialDataDecryptedObject): data is VaultReferenceData {
		return typeof data.$vault === 'string';
	}

	/**
	 * Returns the stored data with the vault's secret fields filled in. Fields that n8n keeps, such
	 * as a base URL, come from the stored data. The vault wins when both have a field.
	 */
	async resolve({
		credentialId,
		credentialName,
		nodeName,
		data,
		workflowId,
		executionId,
		mode,
		onStep,
	}: ResolveInput): Promise<ICredentialDataDecryptedObject> {
		// Each step goes to n8n's log and, for a run started in the editor, to the browser console.
		// A step names ids and fields. It never contains a value, an envelope or a key.
		const say = (text: string, level: 'info' | 'warn' = 'info') => {
			this.logger[level](`Vault: ${text}`, { credentialId, workflowId, executionId });
			onStep?.(text);
		};

		const { $vault: reference, ...storedFields } = data;
		if (!this.config.brokerUrl || !this.config.vaultUrl) {
			throw new UserError('This credential is stored in a vault, but no vault is configured');
		}
		// A changed reference must not point one credential at another credential's secret.
		if (reference !== `kv/creds/${credentialId}`) {
			throw new UserError('The vault reference of this credential does not match the credential');
		}
		if (!workflowId || !executionId) {
			throw new UserError('Credentials stored in a vault can only be used in a workflow run');
		}

		const definitions = await this.definitions.load(workflowId);
		if (!definitions) throw new UserError('The workflow of this run no longer exists');

		// Hash what runs. A published workflow runs its published version, so draft edits must not
		// break the grant, and an edit to the published version must break it. A manual run uses the
		// saved draft. Unsaved changes in the editor are not visible here. The definition is in the
		// normal form, so an editor save that only drops default values does not break the grant.
		const isManual = mode === 'manual' || mode === 'internal';
		const executing = isManual ? definitions.draft : (definitions.active ?? definitions.draft);

		const presentingDraft = isManual || !definitions.active;
		const versionId = presentingDraft ? definitions.draftVersionId : definitions.activeVersionId;
		say(
			`${nodeName ? `node "${nodeName}"` : 'a node'} needs credential "${credentialName ?? credentialId}". ` +
				`n8n holds no secret, so it asks the broker and presents ` +
				`${presentingDraft ? 'the saved draft' : 'the published version'} of the workflow ` +
				`(version ${shortId(versionId)})`,
		);

		try {
			const wrapToken = await this.requestToken({
				workflowId,
				executionId,
				credentialId,
				workflow: { nodes: executing.nodes, connections: executing.connections },
			});
			say('the broker approved and returned a single-use envelope. Opening it at the vault');
			const secrets = await this.unwrap(wrapToken);
			const kept = Object.keys(storedFields);
			say(
				`the vault returned the secret fields (${Object.keys(secrets).join(', ')}). ` +
					`n8n keeps ${kept.length > 0 ? kept.join(', ') : 'nothing else'} and a reference. ` +
					'The secret stays in memory for this run only',
			);
			return { ...storedFields, ...secrets };
		} catch (error) {
			say(`stopped. ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
			throw error;
		}
	}

	private async requestToken(body: object): Promise<string> {
		const { status, body: result } = await this.call<BrokerTokenBody>({
			method: 'POST',
			url: `${this.config.brokerUrl}/token`,
			body,
		});
		if (status === 403) {
			throw new UserError(
				`The vault refused access to this credential: ${result.reason ?? 'not allowed'}`,
			);
		}
		if (status === 404) {
			throw new UserError(
				'This credential has no secret in the vault yet. Open the credential and enter its secrets.',
			);
		}
		if (status !== 200 || !result.wrapToken) {
			throw new OperationalError('The vault broker could not issue a token');
		}
		return result.wrapToken;
	}

	private async unwrap(wrapToken: string): Promise<ICredentialDataDecryptedObject> {
		const { status, body } = await this.call<UnwrappedSecret>({
			method: 'POST',
			url: `${this.config.vaultUrl}/v1/sys/wrapping/unwrap`,
			headers: { 'x-vault-token': wrapToken },
		});
		const value = body.data?.data?.value;
		if (status !== 200 || typeof value !== 'string') {
			throw new OperationalError('The vault did not return the credential data');
		}
		const parsed = jsonParse<unknown>(value, {
			errorMessage: 'The credential data in the vault is not valid JSON',
		});
		if (!isRecord(parsed)) {
			throw new OperationalError('The credential data in the vault is not an object');
		}
		return parsed as ICredentialDataDecryptedObject;
	}

	private async call<T>(options: {
		method: 'POST';
		url: string;
		body?: object;
		headers?: Record<string, string>;
	}): Promise<{ status: number; body: T }> {
		// Admin-configured infrastructure that may be internal: the broker and the vault.
		const client = this.outboundHttp.requests({
			useDefaultSsrfPolicy: 'unsafe',
			timeout: this.config.requestTimeout,
		});
		try {
			const response = await client.request<T>({
				...options,
				json: true,
				maxResponseBodyBytes: MAX_RESPONSE_BYTES,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});
			return { status: response.statusCode, body: response.body };
		} catch (error) {
			throw new OperationalError('The vault could not be reached', { cause: error });
		}
	}
}
