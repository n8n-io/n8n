import { Logger } from '@n8n/backend-common';
import { CredentialsRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import { randomUUID } from 'node:crypto';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	NodeConnectionTypes,
	getParentNodes,
	mapConnectionsByDestination,
	type IDataObject,
} from 'n8n-workflow';
import { z } from 'zod';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import {
	WorkflowTranslator,
	type DeterminismSource,
	type ReplayFailure,
	type TranslateRequest,
} from './agent-determinism.contracts';
import { DeterminismModelResolver } from './determinism-model.resolver';
import {
	MATCH_NODE_NAME,
	REPLY_NODE_NAME,
	buildDraft,
	type AgentDefinition,
	type DraftMeta,
} from './draft-builder';
import { scoreGroup, type MinedRun } from './trace-mining';

const REFINE_TIMEOUT_MS = 180_000;
const SAMPLE_RUNS = 3;
const FEEDBACK_SAMPLES = 5;

/** Chat model nodes for the providers a native agent can name. */
const MODEL_NODES: Record<string, { type: string; typeVersion: number; credentialType: string }> = {
	anthropic: {
		type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		typeVersion: 1.3,
		credentialType: 'anthropicApi',
	},
	openai: {
		type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		typeVersion: 1.2,
		credentialType: 'openAiApi',
	},
};

const RULES = `You turn an AI agent's repeated behaviour into a deterministic n8n workflow. You get the agent's instructions, the workflow mined from its traces, and sample runs.
Fill in only what the workflow leaves open, using n8n expressions ({{ ... }}, $json, $('Node name').first().json, $('Node name').all(), $now).
Where the agent made mistakes in a run, write what its instructions say, not what it did.
For "now" in any time or date rule, use the first that exists: 1) a time the request itself carries (a field such as now, timestamp or date on the trigger item, or a time stated in its message: the request's time wins over every clock); 2) only if the request carries none, the run's start time: DateTime.fromISO($('Trigger').first().json.runAt ?? $now.toISO()). Never use $now or Date.now() on their own.
- filter_conditions: boolean n8n expressions that must all be true for an item to pass the "Pick items" Filter node (each item is one element after the Split Out node, or the previous node's output); [] if there is no such node.
- branch_conditions: if there is a "Which path?" Switch node, one boolean n8n expression per output (1 for path 1, 2 for path 2), deciding from the data available at that point; [] otherwise.
- fills: for every TODO(<id>) marker left in the nodes, one JavaScript expression (no {{ }}) that computes the value from the data at that point (todo = the id inside the parentheses).
- text_templates: for each "Write ..." node other than "${REPLY_NODE_NAME}", an n8n expression that builds the text without a model, matching what the agent wrote; "" to keep the model when it needs judgement.
- reply_prompt: the prompt for the "${REPLY_NODE_NAME}" node, if there is one: how to answer this kind of request from the data, in the agent's style. Keep the request and data expressions of the current prompt in it verbatim. "" if there is no such node.
- match_description: for the "${MATCH_NODE_NAME}" classifier, if there is one: which requests this workflow handles and which it must leave to the agent. "" if there is none.
- insert_nodes: steps the workflow is missing, each placed right after an existing node (it takes over that node's outgoing connections). Use them when the data does not have the shape the next node expects, e.g. a "Split Out" when a tool returns a list inside an object (or pages of them) but the next node reads single items, such as the "Pick items" filter. parameters_json is the node's parameters as a JSON string. [] if nothing is missing.
- changes: what you changed since the previous version and why (or "first version").
When replay failures are given, they come from running the previous version on past runs: fix every one.`;

/** Node types a draft may gain: no side effects, so replay stays safe. */
const INSERTABLE = {
	splitOut: { type: 'n8n-nodes-base.splitOut', typeVersion: 1 },
	set: { type: 'n8n-nodes-base.set', typeVersion: 3.4 },
	code: { type: 'n8n-nodes-base.code', typeVersion: 2 },
	filter: { type: 'n8n-nodes-base.filter', typeVersion: 2.2 },
} as const;

const refineSchema = z.object({
	insert_nodes: z.array(
		z.object({
			after: z.string(),
			name: z.string(),
			kind: z.enum(['splitOut', 'set', 'code', 'filter']),
			parameters_json: z.string(),
			why: z.string(),
		}),
	),
	filter_conditions: z.array(z.object({ expression: z.string(), why: z.string() })),
	branch_conditions: z.array(z.object({ output: z.number().int(), expression: z.string() })),
	fills: z.array(z.object({ todo: z.string(), value: z.string() })),
	text_templates: z.array(z.object({ node: z.string(), template: z.string() })),
	reply_prompt: z.string(),
	match_description: z.string(),
	changes: z.string(),
});
type Refinement = z.infer<typeof refineSchema>;

const clip = (value: unknown, max: number) => {
	const text = JSON.stringify(value) ?? 'undefined';
	return text.length > max ? `${text.slice(0, max)}…(${text.length} chars)` : text;
};

function runText({ run, text, calls }: Pick<MinedRun, 'run' | 'text' | 'calls'>) {
	const steps = calls.map(
		(call) =>
			`${call.name}(${clip(call.input, 500)}) -> ${call.output === undefined ? '(result not recorded)' : clip(call.output, 2500)}`,
	);
	return [
		`--- run ${run.id}`,
		`request: ${text.slice(0, 600)}`,
		...steps,
		`answer: ${clip(run.output, 500)}`,
	].join('\n');
}

const asExpression = (expression: string) =>
	expression.startsWith('=') ? expression : `=${expression}`;
const booleanCondition = (expression: string) => ({
	id: randomUUID(),
	leftValue: asExpression(expression),
	rightValue: '',
	operator: { type: 'boolean', operation: 'true', singleValue: true },
});

/** Replaces `'' /* TODO(id) ... *\/` placeholders with `(value)`, wherever they sit. */
function fillTodo(value: unknown, id: string, fill: string): unknown {
	const marker = `'' /* TODO(${id})`;
	if (typeof value === 'string') {
		return value
			.split(marker)
			.map((part, i) => (i === 0 ? part : `(${fill})${part.slice(part.indexOf('*/') + 2)}`))
			.join('');
	}
	if (Array.isArray(value)) return value.map((child) => fillTodo(child, id, fill));
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillTodo(v, id, fill)]));
	}
	return value;
}

/** Puts a node right after `after`: it takes over `after`'s main outputs. Skips bad inserts. */
export function insertNode(workflow: WorkflowJSON, insert: Refinement['insert_nodes'][number]) {
	const anchor = workflow.nodes.find((node) => node.name === insert.after);
	if (!anchor || workflow.nodes.some((node) => node.name === insert.name)) return;
	let parameters: IDataObject;
	try {
		parameters = JSON.parse(insert.parameters_json) as IDataObject;
	} catch {
		return;
	}
	const [x, y] = anchor.position ?? [0, 0];
	workflow.nodes.push({
		id: randomUUID(),
		name: insert.name,
		...INSERTABLE[insert.kind],
		position: [x + 120, y + 160],
		parameters,
		notes: insert.why,
	} as NodeJSON);
	const outputs = (workflow.connections[insert.after] ??= {});
	workflow.connections[insert.name] = { main: outputs.main ?? [[]] };
	outputs.main = [[{ node: insert.name, type: 'main', index: 0 }]];
}

/** Applies the model's answer to the draft, as the lab script's `refine` does. */
export function applyRefinement(workflow: WorkflowJSON, meta: DraftMeta, refined: Refinement) {
	const byName = (name: string | null) => workflow.nodes.find((node) => node.name === name);
	for (const insert of refined.insert_nodes) insertNode(workflow, insert);
	const filter = byName(meta.pickNode);
	if (filter?.parameters && refined.filter_conditions.length > 0) {
		filter.parameters = {
			...filter.parameters,
			conditions: {
				combinator: 'and',
				options: { caseSensitive: true, typeValidation: 'loose' },
				conditions: refined.filter_conditions.map((c) => booleanCondition(c.expression)),
			},
		};
		filter.notes = `Rules from the agent's instructions and runs: ${refined.filter_conditions.map((c) => c.why).join(' ')}`;
	}

	const switchNode = byName(meta.switchNode);
	const rules = (switchNode?.parameters?.rules as { values?: IDataObject[] } | undefined)?.values;
	for (const { output, expression } of refined.branch_conditions) {
		const rule = rules?.[output - 1];
		if (rule) {
			rule.conditions = {
				combinator: 'and',
				options: { caseSensitive: true, typeValidation: 'loose' },
				conditions: [booleanCondition(expression)],
			};
		}
	}

	for (const { todo, value } of refined.fills) {
		const id = todo.replace(/^TODO\(|\)$/g, '');
		const fill = value.replace(/^=?\s*\{\{|\}\}\s*$/g, '').trim();
		for (const node of workflow.nodes)
			node.parameters = fillTodo(node.parameters, id, fill) as IDataObject;
	}

	// A template replaces the model with a Set node of the same name, so expressions keep working.
	for (const { node: name, template } of refined.text_templates) {
		const writer = byName(name);
		if (!template || !writer || writer.name === REPLY_NODE_NAME || !name.startsWith('Write '))
			continue;
		Object.assign(writer, {
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			parameters: {
				assignments: {
					assignments: [
						{ id: randomUUID(), name: 'text', value: asExpression(template), type: 'string' },
					],
				},
				options: { includeOtherFields: true },
			},
		});
		for (const [from, outputs] of Object.entries(workflow.connections)) {
			if (outputs.ai_languageModel?.[0]?.[0]?.node === name) {
				delete workflow.connections[from];
				workflow.nodes = workflow.nodes.filter((node) => node.name !== from);
			}
		}
	}

	const reply = byName(REPLY_NODE_NAME);
	if (reply?.parameters && refined.reply_prompt) {
		reply.parameters = { ...reply.parameters, text: asExpression(refined.reply_prompt) };
	}
	const gate = byName(MATCH_NODE_NAME);
	const categories = (gate?.parameters?.categories as { categories?: IDataObject[] } | undefined)
		?.categories;
	if (categories?.[0] && refined.match_description) {
		categories[0].description = refined.match_description;
	}
	return workflow;
}

/**
 * Drafts a workflow from the agent's own tool nodes, then asks the project's
 * model for what the traces cannot show: the item rule, branch conditions,
 * TODO values, text templates and prompts.
 */
@Service()
export class TraceWorkflowTranslator extends WorkflowTranslator {
	// ponytail: in-memory, per process; fine because one analysis runs start to end in one process.
	private readonly inserted = new Map<string, Refinement['insert_nodes']>();

	constructor(
		private readonly modelResolver: DeterminismModelResolver,
		private readonly agentRepository: AgentRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly logger: Logger,
	) {
		super();
		this.logger = logger.scoped('agent-determinism');
	}

	async instructions(source: DeterminismSource) {
		return (await this.loadDefinition(source)).instructions;
	}

	async translate({ actor, source, cluster, trainRuns, feedback }: TranslateRequest) {
		const definition = await this.loadDefinition(source);
		// Re-score the train runs: the draft needs their traces, and the holdout stays unseen.
		const score = scoreGroup(cluster.key, trainRuns, trainRuns.length / cluster.trafficShare);
		const { workflow, meta } = buildDraft(source.name, definition, score);

		const model = await this.modelResolver.resolve(actor, source.projectId);
		if (!model) {
			this.logger.warn('No model credential in the project: the draft keeps its placeholders');
			return workflow;
		}
		const { Agent } = await import('@n8n/agents');
		const agent = new Agent('agent-determinism-refiner')
			.model(model)
			.instructions(RULES)
			.structuredOutput(refineSchema);
		const result = await agent.generate(
			this.prompt(
				definition,
				workflow,
				meta,
				score.runs,
				feedback,
				feedback ? (this.inserted.get(source.id) ?? []) : [],
			),
			{
				abortSignal: AbortSignal.timeout(REFINE_TIMEOUT_MS),
			},
		);
		const refined = refineSchema.parse(result.structuredOutput);
		// A redraft starts from the skeleton again: keep the steps earlier rounds added, or their fixes are lost.
		const earlier = feedback ? (this.inserted.get(source.id) ?? []) : [];
		refined.insert_nodes = [
			...earlier,
			...refined.insert_nodes.filter((n) => !earlier.some((e) => e.name === n.name)),
		];
		this.inserted.set(source.id, refined.insert_nodes);
		this.logger.info('Determinism draft refined', {
			sourceId: source.id,
			changes: refined.changes,
		});
		return applyRefinement(workflow, meta, refined);
	}

	private prompt(
		definition: AgentDefinition,
		workflow: WorkflowJSON,
		meta: DraftMeta,
		runs: MinedRun[],
		feedback: ReplayFailure[] = [],
		kept: Refinement['insert_nodes'] = [],
	) {
		const samples = meta.paths.flatMap((path) =>
			runs.filter((run) => run.path === path && run.run.succeeded).slice(0, SAMPLE_RUNS),
		);
		const nodes = workflow.nodes
			.map(
				(node: NodeJSON) =>
					`- ${node.name} [${node.type.split('.').pop()}]${node.notes ? ` (${node.notes})` : ''}: ${clip(node.parameters, 700)}`,
			)
			.join('\n');
		const wiring = Object.entries(workflow.connections)
			.flatMap(([from, outputs]) =>
				(outputs.main ?? []).flatMap((targets) =>
					(targets ?? []).map((t) => `${from} -> ${t.node}`),
				),
			)
			.join('\n');
		const todos = [...new Set(JSON.stringify(workflow.nodes).match(/TODO\([^)]+\)/g) ?? [])];
		const failures = feedback.slice(0, FEEDBACK_SAMPLES).map(({ run, got, steps, why }) => {
			const [mined] = scoreGroup('feedback', [run], 1).runs;
			return `${runText(mined)}\nworkflow gave: ${clip(got, 500)}${steps ? `\nwhat each workflow step put out:\n${steps}` : ''}${why ? `\nwhy it was graded wrong: ${why}` : ''}`;
		});
		return [
			`Agent instructions:\n${definition.instructions || '(not available)'}`,
			`Workflow nodes:\n${nodes}`,
			`Connections:\n${wiring}`,
			`TODOs to fill: ${JSON.stringify(todos)}`,
			`Sample runs:\n${samples.map(runText).join('\n')}`,
			kept.length > 0 &&
				`Steps added in earlier versions, which are kept and inserted again for you (do not list them again):\n${kept.map((n) => `- ${n.name} (${n.kind}) after ${n.after}: ${n.why}`).join('\n')}`,
			failures.length > 0 && `Replay failures of the previous version:\n${failures.join('\n')}`,
		]
			.filter(Boolean)
			.join('\n\n');
	}

	private async loadDefinition(source: DeterminismSource): Promise<AgentDefinition> {
		if (source.type === 'agent') {
			const schema = (await this.agentRepository.findById(source.id))?.schema;
			if (!schema) throw new Error('The source agent no longer exists');
			const tools: AgentDefinition['tools'] = {};
			for (const tool of schema.tools ?? []) {
				if (tool.type !== 'node') continue;
				tools[tool.name] = {
					nodeType: tool.node.nodeType,
					typeVersion: tool.node.nodeTypeVersion,
					parameters: tool.node.nodeParameters as IDataObject,
					credentials: tool.node.credentials,
				};
			}
			return {
				instructions: schema.instructions ?? '',
				requestExpression: '={{ $json.message }}',
				tools,
				model: await this.modelNode(schema.model, schema.credential),
			};
		}

		const workflow = await this.workflowRepository.findById(source.id);
		const agent = workflow?.nodes.find((node) => node.type === AGENT_LANGCHAIN_NODE_TYPE);
		if (!workflow || !agent) throw new Error('The source workflow has no Agent node');
		const byDestination = mapConnectionsByDestination(workflow.connections);
		const parentsOf = (type: (typeof NodeConnectionTypes)[keyof typeof NodeConnectionTypes]) =>
			getParentNodes(byDestination, agent.name, type, 1).flatMap(
				(name) => workflow.nodes.find((node) => node.name === name) ?? [],
			);
		const [modelNode] = parentsOf(NodeConnectionTypes.AiLanguageModel);
		const options = agent.parameters.options as IDataObject | undefined;
		const systemMessage = String(options?.systemMessage ?? '');
		return {
			// A prompt built by an expression cannot be read here.
			instructions: systemMessage.includes('{{') ? '' : systemMessage.replace(/^=/, ''),
			requestExpression:
				agent.parameters.promptType === 'define' && typeof agent.parameters.text === 'string'
					? agent.parameters.text
					: '={{ $json.chatInput }}',
			tools: Object.fromEntries(
				parentsOf(NodeConnectionTypes.AiTool).map((node) => [
					node.name,
					{
						nodeType: node.type,
						typeVersion: node.typeVersion,
						parameters: node.parameters,
						credentials: node.credentials,
					},
				]),
			),
			model: modelNode
				? {
						type: modelNode.type,
						typeVersion: modelNode.typeVersion,
						parameters: modelNode.parameters,
						credentials: modelNode.credentials as NodeJSON['credentials'],
					}
				: null,
		};
	}

	private async modelNode(
		model: unknown,
		credentialId: unknown,
	): Promise<AgentDefinition['model']> {
		if (typeof model !== 'string' || typeof credentialId !== 'string') return null;
		const [provider, ...rest] = model.split('/');
		const node = MODEL_NODES[provider];
		const credential = await this.credentialsRepository.findOneBy({ id: credentialId });
		if (!node || !credential) return null;
		return {
			type: node.type,
			typeVersion: node.typeVersion,
			parameters: { model: { __rl: true, mode: 'id', value: rest.join('/') }, options: {} },
			credentials: { [node.credentialType]: { id: credential.id, name: credential.name } },
		};
	}
}
