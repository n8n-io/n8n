/**
 * Types of the v1 workflow JSON that the converter reads, and of its result.
 *
 * The converter accepts plain JSON, so these types are local and loose. They
 * describe only the fields that the converter reads.
 */
import type { CredentialDerivation } from '../node-compile/specialise.ts';

export interface N8nCredentialRef {
	id?: string | null;
	name?: string;
}

export interface N8nNode {
	id?: string;
	name: string;
	type: string;
	typeVersion?: number;
	position?: [number, number];
	parameters?: Record<string, unknown>;
	credentials?: Record<string, N8nCredentialRef>;
	disabled?: boolean;
	notes?: string;
	alwaysOutputData?: boolean;
	executeOnce?: boolean;
	retryOnFail?: boolean;
	maxTries?: number;
	waitBetweenTries?: number;
	onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';
	continueOnFail?: boolean;
	/** The webhook id of trigger and Wait nodes. */
	webhookId?: string;
}

export interface N8nConnection {
	node: string;
	type: string;
	index: number;
}

/** Connections by source node, then by connection type, then by output index. */
export type N8nConnections = Record<
	string,
	Record<string, Array<N8nConnection[] | null> | undefined> | undefined
>;

export interface N8nWorkflow {
	id?: string;
	name?: string;
	nodes: N8nNode[];
	connections: N8nConnections;
	settings?: Record<string, unknown>;
	pinData?: Record<string, unknown>;
}

export type Severity = 'error' | 'warning' | 'info';

export interface ConvertDiagnostic {
	severity: Severity;
	/** Short stable category. The coverage report ranks blockers by it. */
	code: string;
	message: string;
	/** Name of the node that the diagnostic is about, if any. */
	node?: string;
	/** Parameter path, if any. */
	parameter?: string;
	/** For expression errors: the first missing feature, such as `$now` or `.toFormat()`. */
	feature?: string;
}

export interface ConvertResult {
	/** False when a diagnostic has severity `error`. The source is then best effort. */
	ok: boolean;
	source: string;
	diagnostics: ConvertDiagnostic[];
	/** Names of the nodes that run in the fallback host. */
	fallbackNodes: string[];
	/**
	 * Modules that the node compiler made from node sources, by virtual path. Give them to
	 * `compile` as `extraNodes`.
	 */
	nodes?: Record<string, string>;
	/**
	 * Values that compiled node code needs from the credential of a slot, by slot. The builder of
	 * the credentials document evaluates each `code` on the data of the credential
	 * (`evaluateDerivation`) and stores the text under `data.n8nDerived.<name>`. The module reads
	 * it as a credential template, so node code never has the fields.
	 *
	 * An entry of kind `flag` is the outcome of one condition on the credential: a boolean
	 * under the same key, which node code reads with `ctx.credentialFlag`. An entry of kind
	 * `guard` lists the flags of one node instance, the values that were checked against the
	 * v1 node, and the name of the node. `evaluateCredentialFlags` gives the flags that the
	 * document can hold. `unprovenFlagNodes` gives the nodes whose values were not checked: the
	 * caller converts again with those nodes in the host (`NodeSources.runsInHost`), so a node
	 * never fails for a credential that the v1 node accepts.
	 */
	credentialDerivations?: Record<string, CredentialDerivation[]>;
	/**
	 * Tokens that compiled node code needs and that only n8n can make, by slot. The builder of the
	 * credentials document signs and exchanges each one where the credential data is, and stores
	 * the token under `data.n8nMinted.<name>.access_token`. The module reads it as a credential
	 * template, so node code never has the private key. The builder must make the token again
	 * before it expires.
	 */
	credentialMints?: Record<
		string,
		Array<{ name: string; kind: 'google-service-account'; service: string; scopes: string[] }>
	>;
	/** The n8n credential behind each credential slot of the source. */
	credentials?: Record<string, { id: string | null; name: string; type: string }>;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** A parameter value as text: strings as they are, numbers and booleans as text, else `fallback`. */
export function text(value: unknown, fallback = ''): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return fallback;
}
