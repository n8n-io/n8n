import { isObjectLiteral, Logger } from '@n8n/backend-common';
import {
	hasDescriber,
	normalizeDeclaredCards,
	profileItems,
	type NodeRunFacts,
} from '@n8n/chat-hub';
import { Service } from '@n8n/di';
import type {
	IDataObject,
	INode,
	INodeExecutionData,
	INodeProperties,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowBase,
} from 'n8n-workflow';

import { resolveNodeParametersFromRun } from '@/executions/resolve-node-parameters-from-run';
import { NodeTypes } from '@/node-types';

const MAX_ITEMS = 20;
const TEXT_ONLY_KEYS = new Set(['output', 'text', 'message', 'sendMessage']);

/**
 * Turns a finished run into the plain-JSON `NodeRunFacts` the result card mapper
 * consumes. Registry nodes (those with a describer) are collected as side effects;
 * the `lastNodeExecuted` is the only node that may become a generic candidate, and
 * only its last run, and only when that output is structured and not already a
 * declared card.
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

	async extract(workflow: IWorkflowBase, run: IRun): Promise<NodeRunFacts[]> {
		try {
			return await this.extractUnsafe(workflow, run);
		} catch (error) {
			this.logger.debug('Result card facts extraction failed', { error });
			return [];
		}
	}

	private async extractUnsafe(workflow: IWorkflowBase, run: IRun): Promise<NodeRunFacts[]> {
		const runExecutionData = run.data;
		const runData = runExecutionData?.resultData?.runData ?? {};
		const lastNodeExecuted = runExecutionData?.resultData?.lastNodeExecuted;
		const nodesByName = new Map(workflow.nodes.map((node) => [node.name, node]));
		const collected: Array<{ fact: NodeRunFacts; isGeneric: boolean }> = [];

		for (const [nodeName, runs] of Object.entries(runData)) {
			const node = nodesByName.get(nodeName);
			if (!node || node.disabled) continue;
			const isRegistry = hasDescriber(node.type);
			const isGeneric = !isRegistry;
			const isFinal = nodeName === lastNodeExecuted;
			if (isGeneric && !isFinal) continue;
			if (!Array.isArray(runs)) continue;

			for (const [runIndex, taskData] of runs.entries()) {
				// One malformed run must never drop the facts of the other nodes.
				try {
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
