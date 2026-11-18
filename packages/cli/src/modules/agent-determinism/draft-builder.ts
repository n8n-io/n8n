import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import type { JSONValue } from '@n8n/utils/json/to-json-value';
import { randomUUID } from 'node:crypto';
import type { IDataObject } from 'n8n-workflow';

import { DRAFT_OUTPUT_NODE_NAME, FALLBACK_NODE_NAME } from './agent-determinism.constants';
import {
	SCHEDULE_TRIGGER,
	branchPaths,
	learnItemRule,
	leaves,
	type ArgSource,
	type GroupScore,
	type ItemRule,
	type MinedRun,
} from './trace-mining';

/**
 * Builds a deterministic draft from a scored group of runs, out of the agent's
 * own tool nodes. Ported from the lab script (`research/agent-traces/mine.mjs`).
 * Tool nodes keep the tool's name, so replay can pin them to recorded results.
 */

export type ToolDefinition = {
	nodeType: string;
	typeVersion: number;
	parameters: IDataObject;
	credentials?: NodeJSON['credentials'];
};

export type AgentDefinition = {
	instructions: string;
	/** n8n value that gives the request text, read from the trigger's item. */
	requestExpression: string;
	tools: Record<string, ToolDefinition>;
	/** Chat model node for the AI steps the draft keeps; null when none is known. */
	model: Pick<NodeJSON, 'type' | 'typeVersion' | 'parameters' | 'credentials'> | null;
};

export type DraftMeta = {
	requestJs: string;
	dataJs: string;
	pickNode: string | null;
	itemRule: ItemRule | null;
	switchNode: string | null;
	paths: string[];
};

export const TRIGGER_NODE_NAME = 'Trigger';
export const MATCH_NODE_NAME = 'Is it this request?';
export const REPLY_NODE_NAME = 'Write the reply';
export const pickNodeName = (tool: string) => `Pick items for ${tool}`;

/** An n8n value as JS: `={{ x }}` -> x, `=Hi {{ x }}!` -> `Hi ${x}!`, anything else -> a literal. */
export function templateJs(value: string) {
	if (!value.startsWith('=')) return JSON.stringify(value);
	const parts = value.slice(1).split(/\{\{([\s\S]*?)\}\}/);
	if (parts.length === 3 && !parts[0].trim() && !parts[2].trim()) return parts[1].trim();
	const body = parts
		.map((part, i) => (i % 2 ? `\${${part.trim()}}` : part.replace(/[`\\]|\$\{/g, (m) => `\\${m}`)))
		.join('');
	return `\`${body}\``;
}

const expressionJs = (value: string) =>
	/^=\{\{[\s\S]*\}\}$/.test(value.trim())
		? value.trim().slice(3, -2).trim()
		: JSON.stringify(value);

/** Replaces every `$fromAI('name', ...)` call in a node's parameters with `js(name)`. */
export function replaceFromAi(value: unknown, js: (name: string) => string): unknown {
	if (typeof value === 'string' && value.includes('$fromAI(')) {
		let out = '';
		let i = 0;
		for (;;) {
			const start = value.indexOf('$fromAI(', i);
			if (start < 0) return out + value.slice(i);
			out += value.slice(i, start);
			let depth = 0;
			let quote: string | null = null;
			let j = start + 7;
			for (; j < value.length; j++) {
				const char = value[j];
				if (quote) {
					if (char === '\\') j++;
					else if (char === quote) quote = null;
				} else if (char === "'" || char === '"' || char === '`') quote = char;
				else if (char === '(') depth++;
				else if (char === ')' && --depth === 0) break;
			}
			const name = value.slice(start + 8, j).match(/^\s*['"`]([^'"`]+)['"`]/)?.[1] ?? '';
			out += `(${js(name)})`;
			i = j + 1;
		}
	}
	if (Array.isArray(value)) return value.map((child) => replaceFromAi(child, js));
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, child]) => [key, replaceFromAi(child, js)]),
		);
	}
	return value;
}

const TOOL_ONLY_PARAMETERS = ['toolDescription', 'descriptionType', 'description', 'name'];

/** The plain node for a tool node. `js(name)` is the JS for the tool's input `name`. */
export function plainNode(
	tool: ToolDefinition,
	js: (name: string) => string,
): ToolDefinition & {
	notes?: string;
} {
	if (tool.nodeType === '@n8n/n8n-nodes-langchain.toolCode') {
		const code = typeof tool.parameters.jsCode === 'string' ? tool.parameters.jsCode : '';
		return {
			nodeType: 'n8n-nodes-base.code',
			typeVersion: 2,
			parameters: {
				mode: 'runOnceForEachItem',
				language: 'javaScript',
				jsCode: `// The agent's Code tool, fed the input the agent used to write.\nconst query = ${js('input')};\nconst out = (() => {\n${code}\n})();\nlet response = out;\ntry { response = JSON.parse(out); } catch {}\nreturn { json: { response, sent: query } };`,
			},
		};
	}
	const parameters: IDataObject = {};
	for (const [key, value] of Object.entries(tool.parameters)) {
		if (!TOOL_ONLY_PARAMETERS.includes(key))
			parameters[key] = replaceFromAi(value, js) as IDataObject;
	}
	if (tool.nodeType === '@n8n/n8n-nodes-langchain.toolWorkflow') {
		return {
			nodeType: 'n8n-nodes-base.executeWorkflow',
			typeVersion: 1.2,
			parameters: {
				source: parameters.source ?? 'database',
				workflowId: parameters.workflowId,
				workflowInputs: parameters.workflowInputs,
				options: {},
			},
		};
	}
	if (/^n8n-nodes-base\..+Tool$/.test(tool.nodeType)) {
		return { ...tool, nodeType: tool.nodeType.replace(/Tool$/, ''), parameters };
	}
	return {
		nodeType: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		parameters: {},
		notes: `TODO: no plain node for ${tool.nodeType}; call the same thing here`,
	};
}

const DEFAULT_MODEL: NonNullable<AgentDefinition['model']> = {
	type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
	typeVersion: 1.3,
	parameters: { model: { __rl: true, mode: 'id', value: 'claude-haiku-5-5' }, options: {} },
};

type Leaf = [key: string, source: ArgSource, value: JSONValue];
type Picked = { node: string; field: string; rule: ItemRule | null };

export function buildDraft(
	name: string,
	definition: AgentDefinition,
	score: GroupScore,
): { workflow: WorkflowJSON; meta: DraftMeta } {
	const nodes: NodeJSON[] = [];
	const connections: WorkflowJSON['connections'] = {};
	const names = new Set<string>();
	let x = 0;

	const unique = (base: string) => {
		let candidate = base;
		for (let i = 2; names.has(candidate); i++) candidate = `${base} (${i})`;
		names.add(candidate);
		return candidate;
	};
	const add = (
		base: string,
		type: string,
		typeVersion: number,
		parameters: IDataObject,
		extra: Partial<NodeJSON> & { y?: number } = {},
	) => {
		const { y = 300, ...rest } = extra;
		const nodeName = unique(base);
		nodes.push({
			id: randomUUID(),
			name: nodeName,
			type,
			typeVersion,
			position: [(x += 240), y],
			parameters,
			...rest,
		});
		return nodeName;
	};
	const link = (from: string, to: string, output = 0, type = 'main') => {
		const outputs = ((connections[from] ??= {})[type] ??= []);
		while (outputs.length <= output) outputs.push([]);
		(outputs[output] ??= []).push({ node: to, type, index: 0 });
	};
	const addModel = (target: string) => {
		const model = definition.model ?? DEFAULT_MODEL;
		const modelName = add('Model', model.type, model.typeVersion, model.parameters ?? {}, {
			y: 520,
			...(model.credentials && { credentials: model.credentials }),
			...(!definition.model && { notes: 'Pick a chat model credential.' }),
		});
		link(modelName, target, 0, 'ai_languageModel');
	};

	const isSchedule = score.runs.every(({ run }) => run.trigger === SCHEDULE_TRIGGER);
	const trigger = isSchedule
		? add(TRIGGER_NODE_NAME, 'n8n-nodes-base.scheduleTrigger', 1.2, {
				rule: { interval: [{ field: 'hours', hoursInterval: 1 }] },
			})
		: add(TRIGGER_NODE_NAME, 'n8n-nodes-base.webhook', 2, {
				httpMethod: 'POST',
				path: `deterministic/${randomUUID()}`,
				options: {},
			});
	const requestJs = templateJs(definition.requestExpression).replaceAll(
		'$json',
		`$('${trigger}').first().json`,
	);

	let previous = trigger;
	let previousOutput = 0;
	const step = (next: string) => {
		link(previous, next, previousOutput);
		previous = next;
		previousOutput = 0;
	};

	// Gate: does this request belong to the group? Not needed when the trigger already says so.
	if (!isSchedule && score.share < 1) {
		const gate = add(MATCH_NODE_NAME, '@n8n/n8n-nodes-langchain.textClassifier', 1, {
			inputText: `={{ ${requestJs} }}`,
			categories: {
				categories: [
					{ category: 'match', description: `Requests like: ${score.examples.join(' | ')}` },
					{ category: 'other', description: 'Anything else' },
				],
			},
			options: {},
		});
		step(gate);
		addModel(gate);
		link(gate, FALLBACK_NODE_NAME, 1);
	}

	const branch = branchPaths(score.pathTable, score.runs.length);
	const onPath = (key: string) => score.runs.filter((run) => run.path === key);
	const representatives = branch.keys.map(
		(key) =>
			[...onPath(key)].sort(
				(a, b) =>
					Number(b.run.succeeded) - Number(a.run.succeeded) ||
					Number(b.calls[0]?.output !== undefined) - Number(a.calls[0]?.output !== undefined),
			)[0],
	);

	// Arguments copied from the request are pulled out once, by a small AI step.
	const inputArgs = [
		...new Set(
			representatives.flatMap((run) =>
				run.traces.flatMap((trace) =>
					Object.entries(trace)
						.filter(([, source]) => source.src === 'input')
						.map(([key]) => key),
				),
			),
		),
	];
	const argName = (key: string) => key.replace(/\W/g, '_');
	if (inputArgs.length > 0) {
		const extractor = add(
			'Extract parameters',
			'@n8n/n8n-nodes-langchain.informationExtractor',
			1.2,
			{
				text: `={{ ${requestJs} }}`,
				attributes: {
					attributes: inputArgs.map((key) => ({
						name: argName(key),
						description: `the ${key} the request names`,
						required: false,
					})),
				},
				options: {},
			},
		);
		step(extractor);
		addModel(extractor);
	}

	const nodeOfTool = new Map<string, string>();
	const toolNodes: Array<[tool: string, node: string]> = [];
	let picked: Picked | null = null;

	const pickedList = (p: Picked) =>
		`={{ $('${p.node}').all().map((i) => i.json.${p.field}).join(',') }}`;
	const leafValue = (tool: string, [key, source, value]: Leaf): JSONValue => {
		switch (source.src) {
			case 'const':
				return value;
			case 'blank':
				return '';
			case 'input':
				return `={{ $('Extract parameters').item.json.output.${argName(key)} }}`;
			case 'items':
				return picked
					? pickedList(picked)
					: `={{ '' /* TODO(${tool}.${key}): the items picked earlier */ }}`;
			case 'step': {
				const field = picked?.field.split('.').pop();
				if (picked && field && source.path?.endsWith(`.${field}`)) return pickedList(picked);
				// A cursor from the tool's own previous page: pagination handles it.
				if (source.tool === tool) return '';
				const path = (source.path ?? 'TODO').replace(/\[\*\]/g, '[0]');
				return `={{ $('${nodeOfTool.get(source.tool) ?? source.tool}').item.json.${path} }}`;
			}
			case 'generated':
				return `={{ $('Write ${tool} ${key}').item.json.text }}`;
			case 'decision':
				return `={{ '' /* TODO(${tool}.${key}): the agent decided this, e.g. ${JSON.stringify(value).replace(/\*\//g, '')}; write the rule */ }}`;
			default:
				return `={{ '' /* TODO(${tool}.${key}): the agent chose this (${source.src}) */ }}`;
		}
	};

	/** Adds the tool steps of `path` from index `from`, tracing their args from `representative`. */
	const chain = (path: string[], from: number, representative: MinedRun) => {
		const { calls } = representative;
		const sameRuns = onPath(representative.path);
		let cursor = 0;
		for (const tool of path.slice(0, from)) {
			cursor = Math.max(cursor, calls.findIndex((c, i) => i >= cursor && c.name === tool) + 1);
		}
		for (const tool of path.slice(from)) {
			const index = calls.findIndex((c, i) => i >= cursor && c.name === tool);
			cursor = index + calls.filter((c) => c.name === tool).length;
			const repeated =
				sameRuns.filter((run) => run.calls.filter((c) => c.name === tool).length > 1).length >
				sameRuns.length / 2;
			const trace = representative.traces[index] ?? {};
			const here: Leaf[] = leaves(calls[index]?.input).map(([key, value]) => [
				key,
				trace[key] ?? { src: 'untraced' },
				value,
			]);
			// A later call of the same tool fed from its own previous result is paging.
			const pageCursor = calls
				.map((call, i) => [call, representative.traces[i]] as const)
				.filter(([call]) => call.name === tool)
				.flatMap(([, t]) => Object.entries(t ?? {}))
				.find(([, source]) => source.src === 'step' && source.tool === tool);

			// The first step that acts once per item, on items picked from an earlier result, gets a Filter.
			const wantsItems = repeated || here.some(([, source]) => source.src === 'items');
			if (!picked && !pageCursor && wantsItems) {
				const rule = learnItemRule(sameRuns, tool);
				const segments = (rule?.path ?? '').replace(/^\[\*\]\.?/, '').split('[*].');
				const splitField = segments.length > 1 ? segments[0] : null;
				const inner = segments
					.slice(1, -1)
					.map((segment) => `${segment}[0].`)
					.join('');
				if (rule || repeated) {
					if (splitField) {
						step(
							add('Split into items', 'n8n-nodes-base.splitOut', 1, {
								fieldToSplitOut: splitField,
								options: {},
							}),
						);
					}
					const condition = rule
						? {
								id: randomUUID(),
								leftValue: `={{ $json.${inner}${rule.field} }}`,
								rightValue: rule.threshold,
								operator: { type: 'number', operation: 'lte' },
							}
						: {
								id: randomUUID(),
								leftValue: '={{ true }}',
								rightValue: '',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
							};
					const pickNode = add(
						pickNodeName(tool),
						'n8n-nodes-base.filter',
						2.2,
						{
							conditions: {
								combinator: 'and',
								options: { caseSensitive: true, typeValidation: 'loose' },
								conditions: [condition],
							},
						},
						{
							notes: rule
								? `Learned from the runs: ${rule.field} <= ${rule.threshold} catches ${Math.round(rule.recall * 100)}% of the items the agent acted on.`
								: 'Condition to learn: which items the agent acted on.',
						},
					);
					step(pickNode);
					picked = { node: pickNode, field: `${inner}${rule?.key ?? 'id'}`, rule };
				}
			}

			for (const [key, , value] of here.filter(([, source]) => source.src === 'generated')) {
				const writer = add(`Write ${tool} ${key}`, '@n8n/n8n-nodes-langchain.chainLlm', 1.7, {
					promptType: 'define',
					text: `=Write the ${key} for ${tool} from this data, like the agent did. Example the agent wrote:\n${String(value).slice(0, 300)}\n\nData: {{ JSON.stringify($json) }}`,
				});
				step(writer);
				addModel(writer);
			}

			// JS for one tool input: a leaf, or an object built from its leaves (sent as JSON text).
			const js = (inputName: string) => {
				const mine = here.filter(([key]) => key === inputName || key.startsWith(`${inputName}.`));
				if (mine.length === 0) return "''";
				const asJs = (leaf: Leaf) => {
					const value = leafValue(tool, leaf);
					return typeof value === 'string' ? expressionJs(value) : JSON.stringify(value);
				};
				if (mine.length === 1 && mine[0][0] === inputName) return asJs(mine[0]);
				const fields = mine.map(
					(leaf) => `${JSON.stringify(leaf[0].slice(inputName.length + 1))}: ${asJs(leaf)}`,
				);
				return `JSON.stringify({ ${fields.join(', ')} })`;
			};
			const definitionOfTool = definition.tools[tool];
			const plain = definitionOfTool
				? plainNode(definitionOfTool, js)
				: {
						nodeType: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						parameters: {},
						notes: `TODO: tool ${tool} is not in the agent's definition`,
					};
			if (repeated && pageCursor && plain.nodeType === 'n8n-nodes-base.httpRequest') {
				const [cursorName, cursorSource] = pageCursor;
				const inQuery = JSON.stringify(definitionOfTool?.parameters.queryParameters ?? '').includes(
					`'${cursorName}'`,
				);
				const responsePath = (cursorSource.src === 'step' && cursorSource.path) || cursorName;
				plain.parameters.options = {
					...(plain.parameters.options as IDataObject | undefined),
					pagination: {
						pagination: {
							parameters: {
								parameters: [
									{
										type: inQuery ? 'qs' : 'body',
										name: cursorName,
										value: `={{ $response.body.${responsePath} }}`,
									},
								],
							},
							paginationCompleteWhen: 'other',
							completeExpression: `={{ !$response.body.${responsePath} }}`,
						},
					},
				};
			}
			const executeOnce = picked !== null && !repeated && picked.node !== pickNodeName(tool);
			const toolNode = add(tool, plain.nodeType, plain.typeVersion, plain.parameters, {
				...(plain.credentials && { credentials: plain.credentials }),
				onError: 'continueErrorOutput',
				...(executeOnce && { executeOnce: true }),
				notes: [
					'notes' in plain ? plain.notes : undefined,
					`From the traces: ${here.map(([key, source]) => `${key} ← ${source.src}`).join(', ') || 'no inputs'}`,
				]
					.filter(Boolean)
					.join('\n'),
			});
			step(toolNode);
			link(toolNode, FALLBACK_NODE_NAME, 1);
			if (!nodeOfTool.has(tool)) nodeOfTool.set(tool, toolNode);
			toolNodes.push([tool, toolNode]);
		}
	};

	const ends: Array<[string, number]> = [];
	let switchNode: string | null = null;
	chain(branch.paths[0].slice(0, branch.prefix), 0, representatives[0]);
	if (branch.paths.length === 2) {
		const falseCondition = {
			combinator: 'and',
			options: { caseSensitive: true, typeValidation: 'loose' },
			conditions: [
				{
					id: randomUUID(),
					leftValue: '={{ false }}',
					rightValue: '',
					operator: { type: 'boolean', operation: 'true', singleValue: true },
				},
			],
		};
		switchNode = add(
			'Which path?',
			'n8n-nodes-base.switch',
			3.2,
			{
				rules: {
					values: branch.paths.map((_, i) => ({
						outputKey: `path ${i + 1}`,
						renameOutput: true,
						conditions: structuredClone(falseCondition),
					})),
				},
				options: { fallbackOutput: 'extra' },
			},
			{
				notes: `Path 1: ${branch.keys[0]}. Path 2: ${branch.keys[1]}. Anything else goes to the agent.`,
			},
		);
		step(switchNode);
		link(switchNode, FALLBACK_NODE_NAME, 2);
		for (const [i, path] of branch.paths.entries()) {
			previous = switchNode;
			previousOutput = i;
			chain(path, branch.prefix, representatives[i]);
			ends.push([previous, previousOutput]);
		}
	} else {
		chain(branch.paths[0], branch.prefix, representatives[0]);
		ends.push([previous, previousOutput]);
	}

	const dataJs = `JSON.stringify({ ${toolNodes.map(([tool, node]) => `${JSON.stringify(tool)}: $('${node}').all().map((i) => i.json)`).join(', ')} })`;
	if (isSchedule) {
		// Nobody reads a scheduled run's answer: the tool calls are the result.
		const output = add(
			DRAFT_OUTPUT_NODE_NAME,
			'n8n-nodes-base.set',
			3.4,
			{ mode: 'raw', jsonOutput: "={{ { output: '' } }}", options: {} },
			{ executeOnce: true },
		);
		for (const [end, output_] of ends) link(end, output, output_);
	} else {
		const writer = add(REPLY_NODE_NAME, '@n8n/n8n-nodes-langchain.chainLlm', 1.7, {
			promptType: 'define',
			text: `=Answer this request the way the agent would, from the data only.\n\nCurrent time: {{ $now.toISO() }}\n\nRequest: {{ ${requestJs} }}\n\nData: {{ ${dataJs} }}`,
		});
		for (const [end, output_] of ends) link(end, writer, output_);
		addModel(writer);
		const output = add(DRAFT_OUTPUT_NODE_NAME, 'n8n-nodes-base.set', 3.4, {
			mode: 'raw',
			jsonOutput: '={{ { output: $json.text } }}',
			options: {},
		});
		link(writer, output);
	}

	// Read through a function: `chain` assigns `picked`, which TypeScript cannot see here.
	const pickedAtEnd = (): Picked | null => picked;
	const finalPicked = pickedAtEnd();
	return {
		workflow: { name, nodes, connections, settings: { executionOrder: 'v1' } },
		meta: {
			requestJs,
			dataJs,
			pickNode: finalPicked?.node ?? null,
			itemRule: finalPicked?.rule ?? null,
			switchNode,
			paths: branch.keys,
		},
	};
}
