import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { OperationalError, UnexpectedError, UserError } from '@n8n/errors';
import { ExecuteContext } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteData,
	INode,
} from 'n8n-workflow';
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
export interface MintedToken {
	access_token: string;
	/** When the token expires, in milliseconds since the epoch. */
	expires_at: number;
}

const MINTED_KEY = 'n8nMinted';
/** The member of a slot that tells `wfrt` how the slot is renewed. */
const RENEWAL_KEY = 'renewal';
/** The member of a slot that tells `wfrt` the allowed domains of the credential. */
const ALLOWED_DOMAINS_KEY = 'allowedDomains';
/** `wfrt` reads at most this many status codes for a slot (`renew.zig`). */
const MAX_RENEWAL_STATUSES = 8;

/** How n8n renews the values of a credential slot. */
export type RenewalKind = 'oauth2' | 'preAuthentication' | 'minted';

/**
 * What `wfrt` needs to renew a slot: the response statuses that mean "the value expired",
 * and the time at which the value expires, when n8n knows it.
 */
export interface SlotRenewal {
	status: number[];
	expiresAt?: number;
	/** An OAuth2 slot: a request can carry the `skipTokenRefresh` option of its node. */
	oauth2?: boolean;
	/**
	 * The credential has no `tokenExpiredStatusCode`: the `tokenExpiredStatusCode` that a node
	 * gives with a request takes the place of `status`, as in `requestOAuth2` of n8n-core.
	 */
	statusDefault?: boolean;
}

/** Options of `buildDocument`. */
export interface BuildDocumentOptions {
	/** Throw when a slot cannot be prepared. Without it, the slot is left out with a warning. */
	strict?: boolean;
	/** Tokens made in this renewal, so each workflow of a credential gets the same one. */
	minted?: Map<string, MintedToken>;
}

/** The expiry of the minted tokens of each slot of a credentials document. */
export function mintExpiries(document: Record<string, unknown>): Map<string, number> {
	const expiries = new Map<string, number>();
	for (const [slot, entry] of Object.entries(document)) {
		const data = isRecord(entry) ? entry.data : undefined;
		const minted = isRecord(data) ? data[MINTED_KEY] : undefined;
		if (!isRecord(minted)) continue;
		for (const token of Object.values(minted)) {
			const expiresAt = isRecord(token) ? token.expires_at : undefined;
			if (typeof expiresAt !== 'number') continue;
			expiries.set(slot, Math.min(expiries.get(slot) ?? expiresAt, expiresAt));
		}
	}
	return expiries;
}

/** The statuses that mean "the token expired" for an OAuth2 credential, as n8n-core reads them. */
function oauth2ExpiredStatuses(data: IDataObject): number[] {
	const configured = data.tokenExpiredStatusCode;
	if (configured === undefined || configured === null || configured === '') return [401];
	const list = Array.isArray(configured) ? configured : [configured];
	return list.map((code) => Number(code)).filter((code) => Number.isInteger(code) && code > 0);
}

/** A client-credentials credential that has no access token yet: n8n-core gets one at the first request. */
function needsFirstToken(data: IDataObject): boolean {
	if (data.grantType !== 'clientCredentials') return false;
	const token = isRecord(data.oauthTokenData) ? data.oauthTokenData.access_token : undefined;
	return typeof token !== 'string' || token === '';
}

/** The allowed domains of a credential, as `wfrt` reads them for a request of the HTTP Request node. */
export interface SlotAllowedDomains {
	mode: 'domains' | 'none';
	/** The list of the mode `domains`, as the user wrote it. */
	domains?: string;
}

/** The allowed domains of a credential, or `undefined` when it allows all domains. */
function allowedDomainsOf(data: IDataObject): SlotAllowedDomains | undefined {
	if (data.allowedHttpRequestDomains === 'none') return { mode: 'none' };
	if (data.allowedHttpRequestDomains !== 'domains') return undefined;
	const domains = typeof data.allowedDomains === 'string' ? data.allowedDomains.trim() : '';
	return { mode: 'domains', domains };
}

/** The name of a flag under `data.n8nDerived`. Only a boolean has such a name. */
const FLAG_NAME = /^f[0-9a-f]{8}$/;
/** The lifetime that n8n assumes when the token endpoint gives none. */
const UNKNOWN_LIFETIME_SECONDS = 300;

/** The request that `GoogleApi.authenticate` signs for a minted token. It is never sent. */
const GOOGLE_TOKEN_PROBE_URL = 'https://www.googleapis.com/';

const BEARER = 'Bearer ';

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
		options: BuildDocumentOptions = {},
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
				const read = async () =>
					await this.credentialsHelper.getDecrypted(
						additionalData,
						{ id: use.credentialId, name: use.credentialName },
						use.type,
						'internal',
						toExecuteData(use.type),
					);
				let data = await read();
				const kind = this.renewalKind(use.type, (mints[use.slot] ?? []).length > 0);
				if (kind === 'oauth2' && needsFirstToken(data)) {
					// As v1 at the first request: a client-credentials credential without a token gets one.
					await this.refreshOAuth2(use, workflowId);
					data = await read();
				}
				if (kind === 'preAuthentication') {
					// As v1 before each request: a credential without a session token gets one.
					Object.assign(data, await this.preAuthenticate(use, data, workflowId, false));
				}
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
						// One token for each credential and service in a renewal: every workflow shares it.
						const key = `${use.credentialId}\n${mint.service}\n${mint.scopes.join(' ')}`;
						const token =
							options.minted?.get(key) ??
							(await this.mintToken(use, mint, { ...data }, workflowId));
						options.minted?.set(key, token);
						minted[mint.name] = token;
					}
					Reflect.set(entryData, MINTED_KEY, minted);
				}
				if (kind !== undefined && typeof entry === 'object' && entry !== null) {
					Reflect.set(entry, RENEWAL_KEY, this.slotRenewal(kind, { ...data }, entryData));
				}
				const allowedDomains = allowedDomainsOf(data);
				if (allowedDomains !== undefined && typeof entry === 'object' && entry !== null) {
					Reflect.set(entry, ALLOWED_DOMAINS_KEY, allowedDomains);
				}
				Object.assign(document, file);
			} catch (error) {
				if (options.strict) throw error;
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

	/**
	 * The names of the compiled nodes that must run in the fallback host: a credential gives
	 * the conditions of the node values that were not checked against the v1 node together
	 * (the `guard` of the node). The compiler then compiles the workflow again with these nodes
	 * in the host, so a node never fails for a credential that the v1 node accepts. A
	 * credential that n8n cannot read counts as not checked. Only names of nodes leave this
	 * method: no name and no value of a condition.
	 */
	async unprovenFlagNodes(
		workflowId: string,
		slots: CredentialSlotBinding[],
		derivations: Record<string, CredentialDerivationRequest[]> = {},
	): Promise<string[]> {
		const lang = await loadWorkflowLang();
		const nodes = new Set<string>();
		for (const use of slots) {
			const wanted = derivations[use.slot] ?? [];
			if (!wanted.some((d) => d.kind === 'guard' && d.node !== undefined)) continue;
			let data: ICredentialDataDecryptedObject | undefined;
			if (use.credentialId) {
				try {
					const additionalData = await WorkflowExecuteAdditionalData.getBase({ workflowId });
					data = await this.credentialsHelper.getDecrypted(
						additionalData,
						{ id: use.credentialId, name: use.credentialName },
						use.type,
						'internal',
						toExecuteData(use.type),
					);
				} catch (error) {
					this.logger.debug('Could not read a credential for the conditions of its nodes', {
						workflowId,
						credentialType: use.type,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
			for (const node of lang.unprovenFlagNodes(wanted, data ? { ...data } : undefined)) {
				nodes.add(node);
			}
		}
		return [...nodes].sort();
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
	 * How n8n renews the values of a slot, or `undefined` when the values do not expire.
	 * OAuth2 types refresh the token (or get a new one for the client-credentials grant). A
	 * type with a `preAuthentication` method and an expirable property gets a new session
	 * token. A slot with minted tokens gets new ones.
	 */
	renewalKind(type: string, hasMints: boolean): RenewalKind | undefined {
		if (type === 'oAuth2Api') return 'oauth2';
		if (this.credentialTypes.recognizes(type)) {
			if ((this.credentialTypes.getParentTypes(type) ?? []).includes('oAuth2Api')) return 'oauth2';
			const credentialType = this.credentialTypes.getByName(type);
			const expirable = credentialType.properties?.some(
				(property) => property.type === 'hidden' && property.typeOptions?.expirable === true,
			);
			if (expirable && typeof credentialType.preAuthentication === 'function') {
				return 'preAuthentication';
			}
		}
		return hasMints ? 'minted' : undefined;
	}

	/** The `renewal` member of a slot of the credentials document. */
	private slotRenewal(kind: RenewalKind, data: IDataObject, entryData: unknown): SlotRenewal {
		if (kind === 'oauth2') {
			return {
				status: oauth2ExpiredStatuses(data).slice(0, MAX_RENEWAL_STATUSES),
				oauth2: true,
				...(data.tokenExpiredStatusCode === undefined ? { statusDefault: true } : {}),
			};
		}
		if (kind === 'preAuthentication') return { status: [401] };
		const expiresAt = mintExpiries({ slot: { data: entryData } }).get('slot');
		return expiresAt === undefined ? { status: [401] } : { status: [401], expiresAt };
	}

	/**
	 * Renews the secret part of a credential where the secret is: n8n. An OAuth2 credential
	 * gets a new token and n8n saves it. A credential with `preAuthentication` gets a new
	 * session token and n8n saves it. Minted tokens need nothing here: `buildDocument` makes
	 * them again.
	 */
	async renew(binding: CredentialSlotBinding, workflowId: string, hasMints: boolean) {
		if (!binding.credentialId) {
			throw new UserError(`The credential slot "${binding.slot}" has no credential`);
		}
		const kind = this.renewalKind(binding.type, hasMints);
		if (kind === undefined) {
			throw new UserError(`n8n cannot renew a credential of type "${binding.type}"`);
		}
		if (kind === 'oauth2') {
			await this.refreshOAuth2(binding, workflowId);
		} else if (kind === 'preAuthentication') {
			const additionalData = await WorkflowExecuteAdditionalData.getBase({ workflowId });
			const data = await this.credentialsHelper.getDecrypted(
				additionalData,
				{ id: binding.credentialId, name: binding.credentialName },
				binding.type,
				'internal',
				toExecuteData(binding.type),
			);
			await this.preAuthenticate(binding, data, workflowId, true);
		}
	}

	/**
	 * Runs the `preAuthentication` method of the credential type as v1 does: when the
	 * expirable property is empty or `expired` is true. The helper saves the new value.
	 */
	private async preAuthenticate(
		binding: CredentialSlotBinding,
		data: ICredentialDataDecryptedObject,
		workflowId: string,
		expired: boolean,
	): Promise<ICredentialDataDecryptedObject> {
		const context = await this.refreshContext(binding, workflowId);
		const renewed = await this.credentialsHelper.preAuthentication(
			{ helpers: context.helpers },
			data,
			binding.type,
			context.getNode(),
			expired,
		);
		return renewed ?? {};
	}

	/**
	 * Signs and exchanges a token with the function that the v1 Google nodes use, so the token
	 * is the one a v1 node gets. The private key stays in this process.
	 */
	private async mintToken(
		binding: CredentialSlotBinding,
		mint: CredentialMintRequest,
		data: ICredentialDataDecryptedObject,
		workflowId: string,
	): Promise<MintedToken> {
		const { getGoogleAccessToken, googleServiceAccountScopes } = await import(
			'n8n-nodes-base/dist/nodes/Google/GenericFunctions.js'
		);
		if (mint.kind === 'google-service-account-http') return await this.mintHttpToken(data);
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
	 * The token of the HTTP Request node for a Google service account: the `authenticate` of the
	 * credential type signs with the scopes of the credential data and exchanges the token, as
	 * for each request of the v1 node. v1 sends no token for a credential that is not set up
	 * for the HTTP Request node, so there is none to make then.
	 */
	private async mintHttpToken(data: ICredentialDataDecryptedObject): Promise<MintedToken> {
		const type = this.credentialTypes.getByName('googleApi');
		if (data.httpNode !== true || typeof type.authenticate !== 'function') {
			throw new UserError('The credential is not set up for the HTTP Request node');
		}
		const requestedAt = Date.now();
		const signed = await type.authenticate(
			{ ...data },
			{ url: GOOGLE_TOKEN_PROBE_URL, headers: {} },
		);
		const header: unknown = signed.headers?.Authorization;
		const token =
			typeof header === 'string' && header.startsWith(BEARER) ? header.slice(BEARER.length) : '';
		if (token === '' || token === 'undefined') {
			throw new OperationalError('The token endpoint gave no access token');
		}
		// `authenticate` does not say how long the token lives.
		return { access_token: token, expires_at: requestedAt + UNKNOWN_LIFETIME_SECONDS * 1000 };
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
