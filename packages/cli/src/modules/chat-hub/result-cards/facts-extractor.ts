import { MAX_RESULT_CARDS_PER_MESSAGE } from '@n8n/api-types';
import { isObjectLiteral, Logger } from '@n8n/backend-common';
import {
	hasDescriber,
	normalizeDeclaredCards,
	profileItems,
	type NodeRunFacts,
} from '@n8n/chat-hub';
import { Service } from '@n8n/di';
import {
	CHAT_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	type IDataObject,
	type INode,
	type INodeExecutionData,
	type INodeProperties,
	type IRun,
	type IRunExecutionData,
	type ITaskData,
	type IWorkflowBase,
} from 'n8n-workflow';

import { resolveNodeParametersFromRun } from '@/executions/resolve-node-parameters-from-run';
import { NodeTypes } from '@/node-types';

const MAX_ITEMS = 20;
const TEXT_ONLY_KEYS = new Set(['output', 'text', 'message', 'sendMessage']);

/**
 * Chat plumbing whose "output" is the trigger payload passed through
 * (`{ sessionId, action, chatInput }`) — never a result worth a generic card.
 */
const NEVER_GENERIC_NODE_TYPES = new Set<string>([CHAT_TRIGGER_NODE_TYPE, CHAT_NODE_TYPE]);

/** Identity of one node run within an execution, stable across resumes. */
export const nodeRunKey = (nodeName: string, runIndex: number) => `${nodeName}#${runIndex}`;

const MAX_CHAIN_NODE_TYPES = 4;

/**
 * The icon-cluster chain for a node: the first node that ran (usually the trigger), the
 * nodes that ran right before this one, and this node last — at most four types, no repeats.
 */
export function chainTo(executionOrder: Array<{ name: string; type: string }>, nodeName: string) {
	const index = executionOrder.findIndex((entry) => entry.name === nodeName);
	const path = index === -1 ? executionOrder : executionOrder.slice(0, index + 1);
	const types = path.map((entry) => entry.type).filter((type, i, all) => all.indexOf(type) === i);
	if (types.length <= MAX_CHAIN_NODE_TYPES) return types;
	return [types[0], ...types.slice(-(MAX_CHAIN_NODE_TYPES - 1))];
}

export interface ExtractOptions {
	/**
	 * Whether the `lastNodeExecuted` may become a generic (non-registry) candidate. False in
	 * `responseNodes` mode, where the last node is the Chat node and its output is not the reply.
	 * Defaults to true.
	 */
	allowGenericCandidate?: boolean;
	/** `nodeRunKey`s carded in an earlier segment: skipped before any parameter replay, not counted. */
	alreadyCarded?: string[];
}

/**
 * Turns a finished run into the plain-JSON `NodeRunFacts` the result card mapper
 * consumes. Registry nodes (those with a describer) are collected as side effects,
 * at most `MAX_RESULT_CARDS_PER_MESSAGE` new runs per call so parameter replay stays
 * bounded; the `lastNodeExecuted` is the only node that may become a generic
 * candidate, and only its last run, and only when that output is structured and not
 * already a declared card.
 *
 * Never throws into the chat flow — a malformed node run is skipped on its own, and
 * any failure outside that isolation yields an empty list.
 */
@Service()
export class ResultCardFactsExtractor {
	constructor(
		private readonly logger: Logger,
		private readonly nodeTypes: NodeTypes,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	async extract(
		workflow: IWorkflowBase,
		run: IRun,
		options?: ExtractOptions,
	): Promise<NodeRunFacts[]> {
		try {
			return await this.extractUnsafe(workflow, run, options);
		} catch (error) {
			this.logger.debug('Result card facts extraction failed', { error });
			return [];
		}
	}

	private async extractUnsafe(
		workflow: IWorkflowBase,
		run: IRun,
		options?: ExtractOptions,
	): Promise<NodeRunFacts[]> {
		const allowGenericCandidate = options?.allowGenericCandidate ?? true;
		const alreadyCarded = new Set(options?.alreadyCarded ?? []);
		const runExecutionData = run.data;
		const runData = runExecutionData?.resultData?.runData ?? {};
		const lastNodeExecuted = runExecutionData?.resultData?.lastNodeExecuted;
		const nodesByName = new Map(workflow.nodes.map((node) => [node.name, node]));
		const executionOrder = this.executionOrder(runData, nodesByName);
		const collected: Array<{ fact: NodeRunFacts; isGeneric: boolean }> = [];
		let registryCollected = 0;

		for (const [nodeName, runs] of Object.entries(runData)) {
			const node = nodesByName.get(nodeName);
			if (!node || node.disabled) continue;
			const isRegistry = hasDescriber(node.type);
			const isGeneric = !isRegistry;
			const isFinal = nodeName === lastNodeExecuted;
			if (isGeneric && (!isFinal || !allowGenericCandidate)) continue;
			if (isGeneric && NEVER_GENERIC_NODE_TYPES.has(node.type)) continue;
			if (!Array.isArray(runs)) continue;

			for (const [runIndex, taskData] of runs.entries()) {
				// One malformed run must never drop the facts of the other nodes.
				try {
					if (alreadyCarded.has(nodeRunKey(nodeName, runIndex))) continue;
					// The cap bounds parameter replay; the generic final candidate is independent of it.
					if (isRegistry && registryCollected >= MAX_RESULT_CARDS_PER_MESSAGE) break;
					if (!isObjectLiteral(taskData)) {
						this.logger.debug(`Skipping result card facts for "${nodeName}" run ${runIndex}`, {
							error: 'Task data is not an object',
						});
						continue;
					}
					if (taskData.error || taskData.executionStatus === 'error') continue;
					// Only the final node's last run is a generic candidate; registry nodes get one fact per run.
					if (isGeneric && runIndex !== runs.length - 1) continue;

					const items = this.outputItems(taskData);
					if (items.length === 0) continue;
					const json = items.slice(0, MAX_ITEMS).map((item) => item.json);
					if (isGeneric && (!this.isStructured(json) || normalizeDeclaredCards(json[0]))) continue;

					const params = isRegistry
						? await this.resolveParams(workflow, runExecutionData, nodeName, node, runIndex)
						: {};
					const { resource, operation } = this.resourceAndOperation(node, params);

					if (isRegistry) registryCollected += 1;
					collected.push({
						isGeneric,
						fact: {
							nodeName,
							nodeType: node.type,
							typeVersion: node.typeVersion,
							resource,
							operation,
							runIndex,
							itemCount: items.length,
							items: json,
							binaryNames: this.binaryNames(items),
							params,
							fields: profileItems(json),
							isFinalOutput: isFinal,
							chainNodeTypes: chainTo(executionOrder, nodeName),
							workflow: { name: workflow.name, description: workflow.description ?? undefined },
						},
					});
				} catch (error) {
					this.logger.debug(`Skipping result card facts for "${nodeName}" run ${runIndex}`, {
						error,
					});
					continue;
				}
			}
		}

		// Side effects first (execution order), the generic final output last
		return collected
			.sort((a, b) => Number(a.isGeneric) - Number(b.isGeneric))
			.map(({ fact }) => fact);
	}

	/** Enabled, non-sticky nodes that ran, ordered by the start of their first run. */
	private executionOrder(
		runData: IRunExecutionData['resultData']['runData'],
		nodesByName: Map<string, INode>,
	): Array<{ name: string; type: string }> {
		const entries: Array<{ name: string; type: string; startedAt: number }> = [];
		for (const [name, runs] of Object.entries(runData)) {
			const node = nodesByName.get(name);
			if (!node || node.disabled || node.type === 'n8n-nodes-base.stickyNote') continue;
			if (!Array.isArray(runs) || runs.length === 0) continue;
			const first = runs[0];
			const startedAt =
				isObjectLiteral(first) && typeof first.startTime === 'number'
					? first.startTime
					: Number.MAX_SAFE_INTEGER;
			entries.push({ name, type: node.type, startedAt });
		}
		return entries
			.sort((a, b) => a.startedAt - b.startedAt)
			.map(({ name, type }) => ({ name, type }));
	}

	/** Output items whose `json` is a plain object; anything else cannot be profiled or rendered. */
	private outputItems(taskData: ITaskData): INodeExecutionData[] {
		const main = taskData.data?.main;
		if (!Array.isArray(main)) return [];
		return main
			.flatMap((branch) => (Array.isArray(branch) ? branch : []))
			.filter((item) => isObjectLiteral(item) && isObjectLiteral(item.json));
	}

	private isStructured(items: IDataObject[]): boolean {
		return items.some(
			(item) => isObjectLiteral(item) && Object.keys(item).some((key) => !TEXT_ONLY_KEYS.has(key)),
		);
	}

	private binaryNames(items: INodeExecutionData[]): string[] {
		const names: string[] = [];
		for (const item of items) {
			if (!isObjectLiteral(item.binary)) continue;
			for (const [key, data] of Object.entries(item.binary)) {
				if (!isObjectLiteral(data)) continue;
				names.push(typeof data.fileName === 'string' ? data.fileName : key);
			}
		}
		return names.slice(0, 5);
	}

	private async resolveParams(
		workflow: IWorkflowBase,
		runExecutionData: IRunExecutionData | undefined,
		nodeName: string,
		node: INode,
		runIndex: number,
	): Promise<Record<string, unknown>> {
		if (!runExecutionData) return { ...(node.parameters as Record<string, unknown>) };
		try {
			const { resolved } = await resolveNodeParametersFromRun({
				workflowData: workflow,
				runExecutionData,
				nodeName,
				nodeTypes: this.nodeTypes,
				runIndex,
				itemIndex: 0,
			});
			return resolved;
		} catch (error) {
			this.logger.debug(`Could not replay parameters of "${nodeName}"`, { error });
			return { ...(node.parameters as Record<string, unknown>) };
		}
	}

	/**
	 * n8n omits parameters equal to their default. The replay already applies node-type defaults
	 * (so `params.resource` / `params.operation` are usually present); the description lookup is the
	 * fallback for when the replay itself failed.
	 */
	private resourceAndOperation(
		node: INode,
		params: Record<string, unknown>,
	): { resource?: string; operation?: string } {
		const resource = this.parameterOrDefault(node, params, 'resource', undefined);
		const operation = this.parameterOrDefault(node, params, 'operation', resource);
		return { resource, operation };
	}

	private parameterOrDefault(
		node: INode,
		params: Record<string, unknown>,
		name: 'resource' | 'operation',
		resource: string | undefined,
	): string | undefined {
		const explicit = params[name] ?? node.parameters[name];
		// A leading `=` is an expression the replay could not resolve — not a usable value.
		if (typeof explicit === 'string' && explicit.length > 0 && !explicit.startsWith('=')) {
			return explicit;
		}
		try {
			const properties = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion)
				?.description?.properties;
			if (!Array.isArray(properties)) return undefined;
			const property = properties.find((candidate: INodeProperties) => {
				if (candidate.name !== name) return false;
				const shown = candidate.displayOptions?.show?.resource;
				return !shown || (resource !== undefined && (shown as string[]).includes(resource));
			});
			return typeof property?.default === 'string' ? property.default : undefined;
		} catch {
			return undefined;
		}
	}
}
