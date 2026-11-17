/**
 * AI clusters that run as native library nodes (`src/nodes/chain-llm.ts`).
 *
 * A root AI node gets its sub-nodes through `ai_*` connections. A library node
 * has no connections, so the converter writes the sub-nodes into the parameters
 * of the root: `aiModel` is the chat model. The credential of the call is the
 * credential of the model.
 *
 * `nativeCluster` accepts only the shapes that the library node is proven to run
 * as v1 does. For every other shape it gives the reason, and the cluster runs in
 * the fallback host. The equivalence test uses the same function, so the test
 * proves the parameters that the converter writes.
 */
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

export interface NativeCluster {
	/** The parameters of the library node. Expressions stay as n8n writes them. */
	parameters: Record<string, unknown>;
	/** The name of the sub-node whose credential the library node uses. */
	credentialOf: string;
	/** Sub-nodes that v1 gives one run for each item that the root handles. */
	runsPerItem: string[];
}

const isExpression = (value: unknown): boolean =>
	typeof value === 'string' && value.startsWith('=');

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

function chainLlm(
	version: number,
	p: Record<string, unknown>,
	subs: ClusterSubNode[],
): NativeCluster | string {
	if (subs.length !== 1) return 'sub-nodes';
	const [sub] = subs;
	if (sub.connection !== 'ai_languageModel' || sub.target !== undefined) return 'sub-nodes';
	if (sub.type !== `${LC}lmChatOpenAi`) return `model ${sub.type.replace(LC, '')}`;
	const aiModel = openAiModel(sub);
	if (typeof aiModel === 'string') return aiModel;
	let text: unknown;
	if (version <= 1.3) {
		// The default of `prompt` is an expression that differs by version.
		if (p.prompt === undefined) return 'default prompt';
		text = p.prompt;
	} else {
		if ((p.promptType ?? 'define') !== 'define') return 'prompt type';
		text = p.text ?? '';
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
	if (version >= 1.7) {
		const batching = p.batching ?? {};
		if (!isRecord(batching)) return 'batching';
		// v1 waits between batches of items; the library node runs once for each item.
		if ((batching.delayBetweenBatches ?? 0) !== 0) return 'delay between batches';
		if (isExpression(batching.batchSize)) return 'batch size';
	}
	return {
		parameters: { text, messages: { messageValues }, aiModel },
		credentialOf: sub.name,
		runsPerItem: [sub.name],
	};
}

/**
 * The native form of an AI cluster, or the reason why the cluster stays in the
 * fallback host. `parameters` are the parameters of the root as the workflow has them.
 */
export function nativeCluster(
	type: string,
	version: number,
	parameters: Record<string, unknown>,
	subs: ClusterSubNode[],
): NativeCluster | string {
	if (type === `${LC}chainLlm`) return chainLlm(version, parameters, subs);
	return 'root type';
}

/**
 * The parameters of the OpenAI vendor node as its library node reads them.
 * - Versions 1 to 1.8 have the operation `message` as the default of the resource `text`;
 *   the library node has `response`, the default of versions 2 to 2.3. The adapter names it.
 * - An operation of the other version family gets the marker `openAiHost`, which is not in
 *   the `supports` list, so the call runs in the host (v1 fails there).
 * - An empty `builtInTools` is the default of the parameter; the adapter drops it.
 */
export function openAiVendorParameters(
	p: Record<string, unknown>,
	version: number,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...p };
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
