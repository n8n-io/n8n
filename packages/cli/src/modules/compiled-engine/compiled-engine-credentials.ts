import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { OperationalError, UnexpectedError, UserError } from '@n8n/errors';
import { ExecuteContext } from 'n8n-core';
import type { IDataObject, IExecuteData, INode } from 'n8n-workflow';
import { createRunExecutionData, Workflow } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import type {
	CredentialDerivationRequest,
	CredentialMintRequest,
	CredentialSlotBinding,
} from './compiled-engine.types';
import type { PublicCredential } from './compiled-node-sources';
import { loadWorkflowLang } from './workflow-lang';

function toExecuteData(nodeType: string): IExecuteData {
	return {
		node: { id: '', name: '', type: nodeType, typeVersion: 0, position: [0, 0], parameters: {} },
		data: {},
		source: null,
	};
}

/** A token under `data.n8nMinted` in the credentials document. */
interface MintedToken {
	access_token: string;
	/** When the token expires, in milliseconds since the epoch. */
	expires_at: number;
}

const MINTED_KEY = 'n8nMinted';
/** The name of a flag under `data.n8nDerived`. Only a boolean has such a name. */
const FLAG_NAME = /^f[0-9a-f]{8}$/;
/** The lifetime that n8n assumes when the token endpoint gives none. */
const UNKNOWN_LIFETIME_SECONDS = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The first expiry of the minted tokens in a credentials document, when it has one. */
export function earliestMintExpiry(document: Record<string, unknown>): number | undefined {
	let earliest: number | undefined;
	for (const entry of Object.values(document)) {
		const data = isRecord(entry) ? entry.data : undefined;
		const minted = isRecord(data) ? data[MINTED_KEY] : undefined;
		if (!isRecord(minted)) continue;
		for (const token of Object.values(minted)) {
			const expiresAt = isRecord(token) ? token.expires_at : undefined;
			if (typeof expiresAt === 'number' && (earliest === undefined || expiresAt < earliest)) {
				earliest = expiresAt;
			}
		}
	}
	return earliest;
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
		derivations: Record<string, CredentialDerivationRequest[]> = {},
		mints: Record<string, CredentialMintRequest[]> = {},
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
				// Values that compiled node code needs from this credential: computed here, where the
				// data is, and read by the module as credential templates.
				const entry: unknown = file[use.slot];
				const entryData: unknown =
					typeof entry === 'object' && entry !== null ? Reflect.get(entry, 'data') : undefined;
				if (typeof entryData === 'object' && entryData !== null) {
					const derived: Record<string, string | boolean> = {};
					const existing: unknown = Reflect.get(entryData, 'n8nDerived');
					if (typeof existing === 'object' && existing !== null) Object.assign(derived, existing);
					const wanted = derivations[use.slot] ?? [];
					for (const { name, code, kind } of wanted) {
						if (kind !== undefined || FLAG_NAME.test(name)) continue;
						const value = lang.evaluateDerivation(code, { ...data });
						if (value === undefined) {
							this.logger.warn(`A derived value of credential slot "${use.slot}" is not text`, {
								workflowId,
							});
							continue;
						}
						derived[name] = value;
					}
					// The outcome of each condition on the credential that node code branches on: a
					// boolean, and only for values that were checked against the v1 node. The log has
					// the count, never a name or a value.
					for (const name of Object.keys(derived)) {
						if (FLAG_NAME.test(name)) delete derived[name];
					}
					if (wanted.some((d) => d.kind === 'flag')) {
						const { flags, withheld } = lang.evaluateCredentialFlags(wanted, { ...data });
						Object.assign(derived, flags);
						if (withheld.length > 0) {
							this.logger.warn(
								`Credential slot "${use.slot}" has ${withheld.length} condition(s) that the compiled nodes cannot use`,
								{ workflowId },
							);
						}
					}
					if (Object.keys(derived).length > 0) Reflect.set(entryData, 'n8nDerived', derived);
				}
				// Tokens that need the private key: made here, so the module holds only the token.
				const requested = mints[use.slot] ?? [];
				if (requested.length > 0) {
					if (typeof entryData !== 'object' || entryData === null) {
						throw new UnexpectedError('The credential slot has no data for a minted token');
					}
					const minted: Record<string, MintedToken> = {};
					for (const mint of requested) {
						minted[mint.name] = await this.mintToken(use, mint, { ...data }, workflowId);
					}
					Reflect.set(entryData, MINTED_KEY, minted);
				}
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

	/**
	 * The public part of each credential of the nodes, by `type:id`: the choices, the flags
	 * and the addresses, which the node compiler reads at publish. The data is decrypted
	 * here, and only the public part leaves this method: a secret never reaches the compiler.
	 */
	async publicCredentials(
		workflowId: string,
		nodes: INode[],
	): Promise<Map<string, PublicCredential>> {
		const lang = await loadWorkflowLang();
		const out = new Map<string, PublicCredential>();
		for (const node of nodes) {
			for (const [type, ref] of Object.entries(node.credentials ?? {})) {
				const key = `${type}:${ref.id ?? ''}`;
				if (!ref.id || out.has(key) || !this.credentialTypes.recognizes(type)) continue;
				try {
					const additionalData = await WorkflowExecuteAdditionalData.getBase({ workflowId });
					const data = await this.credentialsHelper.getDecrypted(
						additionalData,
						{ id: ref.id, name: ref.name },
						type,
						'internal',
						toExecuteData(type),
					);
					const info = lang.describeCredentialType(this.credentialTypes.getByName(type));
					out.set(key, lang.publicCredential(info, { ...data }));
				} catch (error) {
					// Without the public part, node code that reads a field of this credential does not compile.
					this.logger.debug('Could not read the public fields of a credential', {
						workflowId,
						credentialType: type,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}
		return out;
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
	 * Signs and exchanges a token with the function that the v1 Google nodes use, so the token
	 * is the one a v1 node gets. The private key stays in this process.
	 */
	private async mintToken(
		binding: CredentialSlotBinding,
		mint: CredentialMintRequest,
		data: IDataObject,
		workflowId: string,
	): Promise<MintedToken> {
		const { getGoogleAccessToken, googleServiceAccountScopes } = await import(
			'n8n-nodes-base/dist/nodes/Google/GenericFunctions'
		);
		const isService = (name: string): name is keyof typeof googleServiceAccountScopes =>
			Object.hasOwn(googleServiceAccountScopes, name);
		if (mint.kind !== 'google-service-account' || !isService(mint.service)) {
			throw new UnexpectedError('The compiled module asks for a token that n8n cannot make');
		}
		// The module was compiled for these scopes: a different table means a different token.
		if (googleServiceAccountScopes[mint.service].join(' ') !== mint.scopes.join(' ')) {
			throw new UnexpectedError('The scopes of the compiled module are not the scopes of n8n');
		}
		const context = await this.refreshContext(binding, workflowId);
		const requestedAt = Date.now();
		const response = await getGoogleAccessToken.call(context, data, mint.service);
		const token = response.access_token;
		if (typeof token !== 'string' || token === '') {
			throw new OperationalError('The token endpoint gave no access token');
		}
		const lifetime =
			typeof response.expires_in === 'number' && response.expires_in > 0
				? response.expires_in
				: UNKNOWN_LIFETIME_SECONDS;
		return { access_token: token, expires_at: requestedAt + lifetime * 1000 };
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
