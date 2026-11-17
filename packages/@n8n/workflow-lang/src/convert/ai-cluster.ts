/**
 * AI clusters that run as native library nodes (`src/nodes/chain-llm.ts`).
 *
 * A root AI node gets its sub-nodes through `ai_*` connections. A library node
 * has no connections, so the converter writes the sub-nodes into the parameters
 * of the root: `aiModel` is the chat model. The credential of the call is the
 * credential of the model. The library node runs once for all input items and gets the
 * parameters of each item in `batch`.
 *
 * `nativeCluster` accepts only the shapes that the library node is proven to run
 * as v1 does. For every other shape it gives the reason, and the cluster runs in
 * the fallback host. The equivalence test uses the same function, so the test
 * proves the parameters that the converter writes.
 */
import { credentialFlagKey } from '../credentials/flags.ts';
import { isRecord } from './types.ts';

const LC = '@n8n/n8n-nodes-langchain.';

/** A sub-node of the cluster and the connection that it supplies. */
export interface ClusterSubNode {
	name: string;
	type: string;
	typeVersion?: number;
	parameters?: Record<string, unknown>;
	connection: string;
	/** The node that gets the data. Undefined means the root. */
	target?: string;
	targetIndex?: number;
}

/** A value that n8n computes from the fields of a credential (`CredentialDerivation`). */
export interface ClusterDerivation {
	name: string;
	code: string;
	kind?: 'flag' | 'guard';
	flags?: string[];
	allowed?: string[];
	node?: string;
}

export interface NativeCluster {
	/** The type of the library node that runs the cluster. */
	libraryType: string;
	/** Parameters of the library node that are the same for all items. All are literals. */
	shared: Record<string, unknown>;
	/**
	 * The parameters of one input item. Expressions stay as n8n writes them. The converter
	 * gives the list of them for all items as the parameter `batch`.
	 */
	perItem: Record<string, unknown>;
	/**
	 * The sub-nodes as parameters (`aiModel`). v1 reads the parameters of a sub-node of the
	 * chain for the first input item only, so their expressions get the first item.
	 */
	forFirstItem: Record<string, unknown>;
	/** The name of the sub-node whose credential the library node uses. */
	credentialOf: string;
	/** The name of the model sub-node. The library node gives its runs. */
	model: string;
	/** The credential flags that the library node reads, and the guard of their proven values. */
	derivations: ClusterDerivation[];
}

/** Eight hex digits of an FNV-1a hash: the name of a guard is unique for each node. */
function hash(text: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}

/** True when the OpenAI credential has an organization (`HAS_ORGANIZATION` of the library node). */
const OPENAI_ORGANIZATION: ClusterDerivation = {
	name: 'f0a11c001',
	kind: 'flag',
	code: '(d) => d.organizationId !== undefined && d.organizationId !== null',
};

/** True when the OpenAI credential adds a custom header (`getCustomCredentialHeader` of v1). */
const OPENAI_CUSTOM_HEADER: ClusterDerivation = {
	name: 'f0a11c002',
	kind: 'flag',
	code: "(d) => !!d.header && typeof d.headerName === 'string' && !!d.headerName && typeof d.headerValue === 'string'",
};

/**
 * The flags of the OpenAI credential and their proven values. The LangChain client sends the
 * key and the custom header, and no organization. Without an organization the injection of the
 * credential type gives that. With an organization the library node names the key itself, and
 * then it cannot send a custom header: that pair of values is not proven, so the caller runs
 * the cluster in the host (`unprovenFlagNodes`).
 */
function openAiDerivations(node: string): ClusterDerivation[] {
	const flags = [OPENAI_ORGANIZATION.name, OPENAI_CUSTOM_HEADER.name];
	const key = (organization: boolean, header: boolean) =>
		credentialFlagKey(flags, {
			[OPENAI_ORGANIZATION.name]: organization,
			[OPENAI_CUSTOM_HEADER.name]: header,
		});
	const allowed = [key(false, false), key(false, true), key(true, false)].sort();
	return [
		OPENAI_ORGANIZATION,
		OPENAI_CUSTOM_HEADER,
		{
			name: `g${hash(`${node}|${allowed.join(',')}`)}`,
			code: '',
			kind: 'guard',
			flags,
			allowed,
			node,
		},
	];
}

/** Options of `lmChatOpenAi` that map to the request, or that only change a failure. */
const OPENAI_OPTIONS = new Set([
	'temperature',
	'maxTokens',
	'topP',
	'frequencyPenalty',
	'presencePenalty',
	'maxRetries',
	'timeout',
]);

const MESSAGE_TYPES = new Set([
	'SystemMessagePromptTemplate',
	'AIMessagePromptTemplate',
	'HumanMessagePromptTemplate',
]);

function openAiModel(sub: ClusterSubNode): Record<string, unknown> | string {
	const version = sub.typeVersion ?? 1;
	if (![1, 1.1, 1.2, 1.3].includes(version)) return `model version ${version}`;
	const p = sub.parameters ?? {};
	let model: unknown;
	if (version >= 1.2) {
		const locator = p.model ?? { mode: 'list', value: 'gpt-5-mini' };
		if (!isRecord(locator) || typeof locator.value !== 'string') return 'model locator';
		model = locator.value;
	} else {
		model = p.model ?? 'gpt-5-mini';
		if (typeof model !== 'string') return 'model name';
	}
	if (model === '') return 'model name';
	let responses = false;
	if (version >= 1.3) {
		const enabled = p.responsesApiEnabled ?? true;
		if (typeof enabled !== 'boolean') return 'responsesApiEnabled';
		responses = enabled;
		const tools = p.builtInTools;
		if (responses && tools !== undefined && !(isRecord(tools) && Object.keys(tools).length === 0))
			return 'built-in tools';
	}
	const options = p.options ?? {};
	if (!isRecord(options)) return 'model options';
	const kept: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(options)) {
		if (!OPENAI_OPTIONS.has(name)) return `model option ${name}`;
		if (name !== 'timeout') kept[name] = value;
	}
	return { provider: 'openAi', responses, model, options: kept };
}

/** The chat model sub-node `lmChatOpenRouter`: the OpenAI client of LangChain with another URL. */
function openRouterModel(sub: ClusterSubNode): Record<string, unknown> | string {
	if ((sub.typeVersion ?? 1) !== 1) return `model version ${sub.typeVersion}`;
	const p = sub.parameters ?? {};
	const model = p.model ?? 'openai/gpt-4.1-mini';
	if (typeof model !== 'string' || model === '') return 'model name';
	const options = p.options ?? {};
	if (!isRecord(options)) return 'model options';
	const kept: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(options)) {
		if (!OPENAI_OPTIONS.has(name)) return `model option ${name}`;
		if (name !== 'timeout') kept[name] = value;
	}
	return { provider: 'openRouter', responses: false, model, options: kept };
}

/** The chat model of a root as the parameter `aiModel`, and the flags of its credential. */
function chatModel(
	root: string,
	sub: ClusterSubNode,
): { aiModel: Record<string, unknown>; derivations: ClusterDerivation[] } | string {
	if (sub.type === `${LC}lmChatOpenAi`) {
		const aiModel = openAiModel(sub);
		return typeof aiModel === 'string'
			? aiModel
			: { aiModel, derivations: openAiDerivations(root) };
	}
	if (sub.type === `${LC}lmChatOpenRouter`) {
		const aiModel = openRouterModel(sub);
		return typeof aiModel === 'string' ? aiModel : { aiModel, derivations: [] };
	}
	return `model ${sub.type.replace(LC, '')}`;
}

function chainLlm(
	root: string,
	version: number,
	p: Record<string, unknown>,
	subs: ClusterSubNode[],
): NativeCluster | string {
	if (subs.length !== 1) return 'sub-nodes';
	const [sub] = subs;
	if (sub.connection !== 'ai_languageModel' || sub.target !== undefined) return 'sub-nodes';
	const chat = chatModel(root, sub);
	if (typeof chat === 'string') return chat;
	const { aiModel } = chat;
	let text: unknown;
	if (version <= 1.3) {
		// The default of `prompt` is an expression that differs by version.
		if (p.prompt === undefined) return 'default prompt';
		text = p.prompt;
	} else {
		text = promptOf(p);
		if (text === undefined) return 'prompt type';
	}
	if ((p.hasOutputParser ?? false) !== false) return 'output parser';
	if ((p.needsFallback ?? false) !== false) return 'fallback model';
	const values = isRecord(p.messages) ? (p.messages.messageValues ?? []) : [];
	if (p.messages !== undefined && !isRecord(p.messages)) return 'messages';
	if (!Array.isArray(values)) return 'messages';
	const messageValues: Array<Record<string, unknown>> = [];
	for (const value of values) {
		if (!isRecord(value)) return 'messages';
		const type = value.type ?? 'SystemMessagePromptTemplate';
		if (typeof type !== 'string' || !MESSAGE_TYPES.has(type)) return 'message type';
		// The message type shows only for a user message; v1 drops it for the other types.
		const user = type === 'HumanMessagePromptTemplate';
		if (user && (value.messageType ?? 'text') !== 'text') return 'image message';
		const message = value.message ?? '';
		if (typeof message !== 'string') return 'message text';
		messageValues.push({ type, message });
	}
	const shared: Record<string, unknown> = { nodeVersion: version };
	if (version >= 1.7) {
		const batching = p.batching ?? {};
		if (!isRecord(batching)) return 'batching';
		const size = batching.batchSize ?? 5;
		const delay = batching.delayBetweenBatches ?? 0;
		if (typeof size !== 'number' || typeof delay !== 'number') return 'batching';
		shared.batchSize = size;
		shared.delayBetweenBatches = delay;
	}
	return {
		libraryType: `${LC}chainLlm`,
		shared,
		perItem: { text, messages: { messageValues } },
		forFirstItem: { aiModel },
		credentialOf: sub.name,
		model: sub.name,
		derivations: chat.derivations,
	};
}

/** Options of the Tools Agent that the native form reads, or that change nothing without tools. */
const AGENT_OPTIONS = new Set([
	'systemMessage',
	'maxIterations',
	'returnIntermediateSteps',
	'enableStreaming',
	'batching',
]);

/** The prompt of a root: the text parameter, or the field that the chat trigger gives. */
function promptOf(p: Record<string, unknown>): unknown {
	const type = p.promptType ?? 'define';
	if (type === 'define') return p.text ?? '';
	if (type === 'auto') return '={{ $json.chatInput }}';
	if (type === 'guardrails') return '={{ $json.guardrailsInput }}';
	return undefined;
}

/**
 * The Tools Agent of versions 2 to 3.1 with one OpenAI chat model and nothing else. It is one
 * call of the model, so it runs as the library node of the chain with `kind: 'agent'`.
 * Versions before 2 ask the model for a stream; they stay in the host.
 */
function toolsAgent(
	root: string,
	version: number,
	p: Record<string, unknown>,
	subs: ClusterSubNode[],
	context: ClusterContext,
): NativeCluster | string {
	if (![2, 2.1, 2.2, 3, 3.1].includes(version)) return `agent version ${version}`;
	if (subs.length !== 1) return 'sub-nodes';
	const [sub] = subs;
	if (sub.connection !== 'ai_languageModel' || sub.target !== undefined) return 'sub-nodes';
	if ((sub.targetIndex ?? 0) !== 0) return 'sub-nodes';
	const chat = chatModel(root, sub);
	if (typeof chat === 'string') return chat;
	const { aiModel } = chat;
	// Before version 3 the agent refuses a model that uses the Responses API.
	if (version < 3 && aiModel.responses === true) return 'responses model before version 3';
	if ((p.hasOutputParser ?? false) !== false) return 'output parser';
	if ((p.needsFallback ?? false) !== false) return 'fallback model';
	const text = promptOf(p);
	if (text === undefined) return 'prompt type';
	const options = p.options ?? {};
	if (!isRecord(options)) return 'options';
	for (const name of Object.keys(options)) {
		if (!AGENT_OPTIONS.has(name)) return `option ${name}`;
	}
	// With a trigger that streams the answer, v1 asks the model for a stream.
	const streaming = options.enableStreaming ?? true;
	if (streaming !== false && (context.streams || streaming !== true) && version >= 2.1) {
		return 'streaming';
	}
	const maxIterations = options.maxIterations ?? 10;
	if (typeof maxIterations !== 'number') return 'max iterations';
	const steps = options.returnIntermediateSteps ?? false;
	if (typeof steps !== 'boolean') return 'intermediate steps';
	// Before version 3, a tool call of the model is a step with LangChain objects in it.
	if (steps && version < 3) return 'intermediate steps before version 3';
	const batching = options.batching ?? {};
	if (!isRecord(batching)) return 'batching';
	const size = batching.batchSize ?? 1;
	const delay = batching.delayBetweenBatches ?? 0;
	if (typeof size !== 'number' || size < 1 || typeof delay !== 'number') return 'batching';
	const shared: Record<string, unknown> = {
		kind: 'agent',
		nodeVersion: version,
		maxIterations,
		batchSize: size,
		delayBetweenBatches: delay,
	};
	if (steps) shared.returnIntermediateSteps = true;
	return {
		libraryType: `${LC}chainLlm`,
		shared,
		perItem: { text, systemMessage: options.systemMessage },
		forFirstItem: { aiModel },
		credentialOf: sub.name,
		model: sub.name,
		derivations: chat.derivations,
	};
}

/** What the converter knows about the workflow of the cluster. */
export interface ClusterContext {
	/** True when a trigger of the workflow streams the answer to its caller. */
	streams: boolean;
}

/**
 * The native form of an AI cluster, or the reason why the cluster stays in the
 * fallback host. `parameters` are the parameters of the root as the workflow has them.
 */
export function nativeCluster(
	root: { name: string; type: string; typeVersion: number },
	parameters: Record<string, unknown>,
	subs: ClusterSubNode[],
	context: ClusterContext = { streams: false },
): NativeCluster | string {
	if (root.type === `${LC}agent`) {
		return toolsAgent(root.name, root.typeVersion, parameters, subs, context);
	}
	if (root.type === `${LC}chainLlm`) return chainLlm(root.name, root.typeVersion, parameters, subs);
	return 'root type';
}

/**
 * The parameters of the OpenAI vendor node as its library node reads them.
 * - Versions 1 to 1.8 have the operation `message` as the default of the resource `text`;
 *   the library node has `response`, the default of versions 2 to 2.3. The adapter names it.
 * - An operation of the other version family gets the marker `openAiHost`, which is not in
 *   the `supports` list, so the call runs in the host (v1 fails there).
 * - An empty `builtInTools` is the default of the parameter; the adapter drops it.
 * - Several choices (`options.n`) under "continue (using error output)" get the marker too.
 */
export function openAiVendorParameters(
	p: Record<string, unknown>,
	version: number,
	onError?: string,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...p };
	// With several choices an item gives several output items. The error output pairs the
	// items by position, so that shape runs in the host.
	if (isRecord(p.options) && p.options.n !== undefined && onError === 'continueErrorOutput') {
		out.openAiHost = true;
	}
	if (isRecord(p.builtInTools) && Object.keys(p.builtInTools).length === 0) delete out.builtInTools;
	if ((p.resource ?? 'text') !== 'text') return out;
	if (version < 2) {
		if (p.operation === undefined) out.operation = 'message';
		else if (p.operation === 'response') out.openAiHost = true;
	} else if (p.operation === 'message') {
		out.openAiHost = true;
	}
	return out;
}

/** The parameters of the Anthropic vendor node: only version 1 exists. */
function anthropicVendorParameters(
	p: Record<string, unknown>,
	version: number,
): Record<string, unknown> {
	return version === 1 ? p : { ...p, anthropicHost: true };
}

/**
 * The parameters of the Google Gemini vendor node. An empty `builtInTools` is the default of
 * the parameter; the adapter drops it. Several candidates under "continue (using error
 * output)" get the marker `geminiHost`: the error output pairs the items by position.
 */
function geminiVendorParameters(
	p: Record<string, unknown>,
	_version: number,
	onError?: string,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...p };
	if (isRecord(p.builtInTools) && Object.keys(p.builtInTools).length === 0) delete out.builtInTools;
	if (
		isRecord(p.options) &&
		p.options.candidateCount !== undefined &&
		onError === 'continueErrorOutput'
	) {
		out.geminiHost = true;
	}
	return out;
}

type VendorAdapter = (
	p: Record<string, unknown>,
	version: number,
	onError?: string,
) => Record<string, unknown>;

/**
 * The vendor nodes with a library form. The v1 node has a router that handles each item and
 * "continue on fail" itself, so the library node runs once for all items: it gets the
 * parameters of each item in `batch`, and `continueOnFail` under a "continue" setting.
 * `resource` and `operation` are the defaults of the library node.
 */
export const VENDOR_NODES: Record<
	string,
	{ adapt: VendorAdapter; resource: string; operation: string }
> = {
	[`${LC}openAi`]: { adapt: openAiVendorParameters, resource: 'text', operation: 'response' },
	[`${LC}anthropic`]: { adapt: anthropicVendorParameters, resource: 'text', operation: 'message' },
	[`${LC}googleGemini`]: { adapt: geminiVendorParameters, resource: 'text', operation: 'message' },
};
