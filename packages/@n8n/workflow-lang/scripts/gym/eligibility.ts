/**
 * Classifies a sample workflow for the gym differential test:
 * - `eligible`: every external call goes to a gym service with the operation
 *   implemented, or the workflow makes no external call;
 * - `partial`: each external node has a gym service, but an operation or a
 *   credential type is not implemented in the gym;
 * - `ineligible`: a node calls a service that the gym does not have.
 */
import { credentialTypesOf, knownType, parameterValue } from './descriptions.ts';
import type { JsonRecord, SampleNode } from './sample.ts';
import { connectionTargets, isRecord, mainTrigger, nodesOf } from './sample.ts';
import type { GymContracts } from './services.ts';
import { serviceForHost } from './services.ts';

export type Eligibility = 'eligible' | 'partial' | 'ineligible';

export interface ExternalNode {
	node: string;
	type: string;
	service: string;
	operation: string;
	/** The credential type that the node uses, when it uses one. */
	credentialType?: string;
	/** The gym service that issues the credential (it can differ from `service`). */
	credentialService?: string;
	/** Every service that names the node or issues its credential: the tenant gets them all. */
	allServices?: string[];
}

export interface Classification {
	status: Eligibility;
	/** For `partial` and `ineligible`: why, one entry for each node that fails. */
	reasons: string[];
	/** The short reason key of the report tables. */
	reasonKey?: string;
	services: string[];
	external: ExternalNode[];
}

const BASE = 'n8n-nodes-base.';
const LANGCHAIN = '@n8n/n8n-nodes-langchain.';

/** Nodes that make no network call: core nodes, local file and data nodes, AI roots and local AI sub-nodes. */
const INTERNAL = new Set([
	...[
		'set',
		'if',
		'filter',
		'switch',
		'merge',
		'noOp',
		'limit',
		'sort',
		'splitOut',
		'aggregate',
		'removeDuplicates',
		'splitInBatches',
		'code',
		'function',
		'functionItem',
		'stopAndError',
		'respondToWebhook',
		'dateTime',
		'crypto',
		'itemLists',
		'renameKeys',
		'compareDatasets',
		'summarize',
		'markdown',
		'xml',
		'html',
		'htmlExtract',
		'executeWorkflow',
		'executeWorkflowTrigger',
		'manualTrigger',
		'webhook',
		'scheduleTrigger',
		'cron',
		'interval',
		'start',
		'stickyNote',
		'wait',
		'form',
		'formTrigger',
		'convertToFile',
		'extractFromFile',
		'moveBinaryData',
		'spreadsheetFile',
		'readBinaryFile',
		'readBinaryFiles',
		'writeBinaryFile',
		'readWriteFile',
		'readPDF',
		'compression',
		'editImage',
		'iCal',
		'jwt',
		'totp',
		'debugHelper',
		'n8nTrainingCustomerDatastore',
		'n8nTrainingCustomerMessenger',
		'executionData',
		'evaluation',
		'evaluationTrigger',
		'evaluationMetrics',
		'dataTable',
		'executeCommand',
		'errorTrigger',
		'quickChart',
	].map((t) => `${BASE}${t}`),
	'n8n-nodes-testing.testData',
	...[
		'agent',
		'agentTool',
		'chainLlm',
		'chainRetrievalQa',
		'chainSummarization',
		'code',
		'toolCode',
		'toolCalculator',
		'toolWorkflow',
		'toolVectorStore',
		'retrieverVectorStore',
		'vectorStoreInMemory',
		'memoryBufferWindow',
		'outputParserStructured',
		'outputParserAutofixing',
		'outputParserItemList',
		'textSplitterTokenSplitter',
		'textSplitterCharacterTextSplitter',
		'textSplitterRecursiveCharacterTextSplitter',
		'documentDefaultDataLoader',
		'chatTrigger',
		'chat',
		'mcpTrigger',
		'memoryChatRetriever',
		'chatHitlTool',
	].map((t) => `${LANGCHAIN}${t}`),
]);

/** Nodes whose host comes from a URL parameter. */
const URL_NODES = new Set([
	`${BASE}httpRequest`,
	`${BASE}httpRequestTool`,
	`${BASE}graphql`,
	`${BASE}rssFeedRead`,
	`${LANGCHAIN}toolHttpRequest`,
]);

/** The short name of a node type, as the gym contracts write it (`slack`, `lmChatOpenAi`). */
export function shortType(type: string): string {
	const short = type.slice(type.lastIndexOf('.') + 1);
	// Tool variants (`slackTool`) call the same API as the node.
	return /Tool$/.test(short) && short !== 'agentTool' ? short.slice(0, -4) : short;
}

function isTriggerType(type: string): boolean {
	return /trigger$/i.test(type) || type === `${BASE}webhook` || type === `${BASE}start`;
}

/** Nodes that run: reachable on main connections from the trigger, plus the AI sub-nodes of these. */
export function reachableNodes(wf: JsonRecord): SampleNode[] {
	const nodes = nodesOf(wf).filter((n) => !n.disabled);
	const trigger = mainTrigger(wf);
	if (!trigger) return [];
	const conns = isRecord(wf.connections) ? wf.connections : {};
	const edges: Array<{ from: string; to: string; kind: string }> = [];
	for (const [from, types] of Object.entries(conns)) {
		if (!isRecord(types)) continue;
		for (const [kind, outputs] of Object.entries(types)) {
			if (!Array.isArray(outputs)) continue;
			for (const list of outputs) {
				if (!Array.isArray(list)) continue;
				for (const c of list)
					if (isRecord(c) && typeof c.node === 'string') edges.push({ from, to: c.node, kind });
			}
		}
	}
	const live = new Set([trigger.name]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const e of edges) {
			const step =
				e.kind === 'main'
					? live.has(e.from) && !live.has(e.to)
					: live.has(e.to) && !live.has(e.from);
			if (step) {
				live.add(e.kind === 'main' ? e.to : e.from);
				changed = true;
			}
		}
	}
	return nodes.filter((n) => live.has(n.name));
}

function literalUrl(node: SampleNode): string | undefined {
	const p = node.parameters ?? {};
	const raw = p.url ?? p.endpoint ?? p.feedUrl ?? p.requestUrl;
	if (typeof raw !== 'string') return undefined;
	if (raw.startsWith('=') || raw.includes('{{')) return undefined;
	return raw;
}

function operationOf(node: SampleNode): { resource?: string; operation?: string } {
	const resource = parameterValue(node, 'resource');
	const operation = parameterValue(node, 'operation');
	return {
		resource: typeof resource === 'string' ? resource : undefined,
		operation: typeof operation === 'string' ? operation : undefined,
	};
}

/** The credential type that the node uses: the one in its JSON, else the one its parameters pick. */
export function credentialTypeOf(node: SampleNode): string | undefined {
	const own = Object.keys(node.credentials ?? {});
	const options = credentialTypesOf(node);
	const fromParams = [node.parameters?.nodeCredentialType, node.parameters?.genericAuthType].filter(
		(x): x is string => typeof x === 'string',
	);
	const authentication = node.parameters?.authentication;
	if (
		URL_NODES.has(node.type) &&
		(authentication === undefined || authentication === 'none') &&
		fromParams.length === 0
	) {
		return undefined;
	}
	return own.find((t) => options.includes(t)) ?? own[0] ?? fromParams[0] ?? options[0];
}

function classifyNode(
	node: SampleNode,
	contracts: GymContracts,
):
	| { kind: 'internal' }
	| { kind: 'external'; ext: ExternalNode }
	| { kind: Eligibility; reason: string; key: string } {
	if (INTERNAL.has(node.type)) return { kind: 'internal' };
	const short = shortType(node.type);
	if (URL_NODES.has(node.type)) {
		const url = literalUrl(node);
		if (url === undefined)
			return {
				kind: 'partial',
				reason: `${node.name}: the URL is an expression`,
				key: 'http: URL is an expression',
			};
		let host: string;
		try {
			host = new URL(url).hostname;
		} catch {
			return {
				kind: 'partial',
				reason: `${node.name}: the URL does not parse`,
				key: 'http: bad URL',
			};
		}
		const service = serviceForHost(contracts, host);
		if (!service)
			return { kind: 'ineligible', reason: `${node.name}: host ${host}`, key: `http host ${host}` };
		return {
			kind: 'external',
			ext: {
				node: node.name,
				type: node.type,
				service,
				operation: 'http',
				credentialType: credentialTypeOf(node),
			},
		};
	}
	// Triggers do not call out in a manual run: the run starts at them with an item.
	if (isTriggerType(node.type)) return { kind: 'internal' };
	if (!knownType(node.type))
		return { kind: 'ineligible', reason: `${node.name}: unknown type`, key: `unknown ${short}` };
	const cov = contracts.nodes.get(short);
	if (!cov || cov.services.size === 0)
		return { kind: 'ineligible', reason: `${node.name}: ${short}`, key: short };
	const { resource, operation } = operationOf(node);
	const op = [resource, operation].filter(Boolean).join('.').toLowerCase();
	const service = [...cov.services][0];
	const credentialType = credentialTypeOf(node);
	const issuers = credentialType
		? [...(contracts.credentialTypes.get(credentialType) ?? [])].sort()
		: [];
	const credentialService = issuers.find((x) => cov.services.has(x)) ?? issuers[0];
	const ext: ExternalNode = {
		node: node.name,
		type: node.type,
		service,
		operation: op,
		credentialType,
		credentialService,
		allServices: [...new Set([...cov.services, ...issuers])].sort(),
	};
	if (credentialType && !contracts.credentialTypes.has(credentialType)) {
		return {
			kind: 'partial',
			reason: `${node.name}: credential ${credentialType}`,
			key: `credential ${credentialType}`,
		};
	}
	const opMatches =
		op === '' ||
		cov.ops.has(op) ||
		(operation !== undefined &&
			!resource &&
			[...cov.ops].some((o) => o.endsWith(`.${operation.toLowerCase()}`)));
	if (opMatches || (cov.whole && cov.ops.size === 0)) return { kind: 'external', ext };
	if (cov.whole && !cov.missingOps.has(op)) return { kind: 'external', ext };
	return { kind: 'partial', reason: `${node.name}: ${short} ${op}`, key: `${short} ${op}` };
}

export function classify(
	wf: JsonRecord,
	contracts: GymContracts,
	callees: JsonRecord[] = [],
): Classification {
	if (!mainTrigger(wf)) {
		return {
			status: 'ineligible',
			reasons: ['no trigger'],
			reasonKey: 'no trigger',
			services: [],
			external: [],
		};
	}
	void connectionTargets;
	const nodes = [
		...reachableNodes(wf),
		...callees.flatMap((c) => nodesOf(c).filter((n) => !n.disabled)),
	];
	const external: ExternalNode[] = [];
	const partial: Array<{ reason: string; key: string }> = [];
	const missing: Array<{ reason: string; key: string }> = [];
	for (const node of nodes) {
		const c = classifyNode(node, contracts);
		if (c.kind === 'internal') continue;
		if (c.kind === 'external') external.push(c.ext);
		else if (c.kind === 'partial') partial.push(c);
		else missing.push(c);
	}
	const services = [
		...new Set(
			external.flatMap(
				(e) =>
					e.allServices ?? (e.credentialService ? [e.service, e.credentialService] : [e.service]),
			),
		),
	].sort();
	if (missing.length > 0) {
		return {
			status: 'ineligible',
			reasons: missing.map((m) => m.reason),
			reasonKey: missing[0].key,
			services,
			external,
		};
	}
	if (partial.length > 0) {
		return {
			status: 'partial',
			reasons: partial.map((m) => m.reason),
			reasonKey: partial[0].key,
			services,
			external,
		};
	}
	return { status: 'eligible', reasons: [], services, external };
}
