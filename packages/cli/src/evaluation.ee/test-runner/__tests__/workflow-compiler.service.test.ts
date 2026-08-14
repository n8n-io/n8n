import type { EvaluationConfig } from '@n8n/db';
import { createRequire } from 'module';
import type {
	INodeType,
	INodeTypeDescription,
	IWorkflowBase,
	NodeLoadingDetails,
} from 'n8n-workflow';
import { join } from 'path';

import type { NodeTypes } from '@/node-types';

import { LlmJudgeProviderRegistry } from '../../llm-judge-provider-registry';
import { WorkflowCompilerService } from '../workflow-compiler.service';

const EVALUATION_TRIGGER_NODE_TYPE = 'n8n-nodes-base.evaluationTrigger';

// Load the REAL chat-model node descriptions from the built @n8n/n8n-nodes-langchain
// package (via absolute-path require, the same mechanism as test-integration's
// loadNodesFromDist) so these tests bind to the actual node contract the compiler
// introspects. If a provider node changes its version array or `@version`-gated
// `model` shape, these tests reflect that change instead of passing against a stale
// hand-authored replica. Requires the langchain package to be built.
const nodeRequire = createRequire(__filename);
const LANGCHAIN_DIR = join(__dirname, '../../../../../@n8n/nodes-langchain');

function realNodeDescription(shortName: string): INodeTypeDescription {
	const known = nodeRequire(join(LANGCHAIN_DIR, 'dist/known/nodes.json')) as Record<
		string,
		NodeLoadingDetails
	>;
	const info = known[shortName];
	const nodeModule = nodeRequire(join(LANGCHAIN_DIR, info.sourcePath)) as Record<
		string,
		new () => INodeType
	>;
	return new nodeModule[info.className]().description;
}

// Anthropic exposes `model` as a resource locator on its current (default) version;
// Ollama keeps it a plain options field on a single version. Any other provider is
// absent here so the compiler exercises its introspection fallback.
const ANTHROPIC_DESCRIPTION = realNodeDescription('lmChatAnthropic');
const OLLAMA_DESCRIPTION = realNodeDescription('lmChatOllama');

const nodeTypes = {
	getByNameAndVersion: (nodeType: string) => {
		if (nodeType === '@n8n/n8n-nodes-langchain.lmChatAnthropic') {
			return { description: ANTHROPIC_DESCRIPTION };
		}
		if (nodeType === '@n8n/n8n-nodes-langchain.lmChatOllama') {
			return { description: OLLAMA_DESCRIPTION };
		}
		throw new Error(`unknown node type ${nodeType}`);
	},
} as unknown as NodeTypes;

function baseWorkflow(): IWorkflowBase {
	return {
		id: 'wf1',
		name: 'wf1',
		active: false,
		isArchived: false,
		connections: {
			UserTrigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
		},
		nodes: [
			{
				id: 'n-trigger',
				name: 'UserTrigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'n-agent',
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 0],
				parameters: {},
			},
		],
		settings: {},
	} as unknown as IWorkflowBase;
}

function baseConfig(): EvaluationConfig {
	return {
		id: 'cfg-1',
		workflowId: 'wf1',
		name: 'eval',
		status: 'valid',
		invalidReason: null,
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'dt-1' },
		startNodeName: 'Agent',
		endNodeName: 'Agent',
		metrics: [
			{
				id: 'm-expr',
				name: 'Latency OK',
				type: 'expression',
				config: { expression: '={{ 1 < 2 }}', outputType: 'boolean' },
			},
		],
	} as unknown as EvaluationConfig;
}

function llmJudgeConfig(provider: string, model: string): EvaluationConfig {
	const config = baseConfig();
	config.metrics = [
		{
			id: 'm-judge',
			name: 'Correctness',
			type: 'llm_judge',
			config: {
				preset: 'correctness',
				prompt: 'Judge it',
				provider,
				credentialId: 'cred',
				model,
				outputType: 'numeric',
				inputs: { actualAnswer: '={{ $json.a }}', expectedAnswer: '={{ $json.e }}' },
			},
		},
	];
	return config;
}

describe('WorkflowCompilerService', () => {
	let compiler: WorkflowCompilerService;

	beforeEach(() => {
		compiler = new WorkflowCompilerService(new LlmJudgeProviderRegistry(), nodeTypes);
	});

	it('injects __eval_trigger and leaves the user trigger intact, redirecting the edge to entry', () => {
		const compiled = compiler.compile(baseWorkflow(), baseConfig());

		const nodeNames = compiled.nodes.map((n) => n.name).sort();
		expect(nodeNames).toEqual(['Agent', 'UserTrigger', '__eval_metric_m-expr', '__eval_trigger']);

		// User trigger preserved as-is.
		const userTrigger = compiled.nodes.find((n) => n.name === 'UserTrigger')!;
		expect(userTrigger.type).toBe('n8n-nodes-base.manualTrigger');

		const evalTrigger = compiled.nodes.find((n) => n.name === '__eval_trigger')!;
		expect(evalTrigger.type).toBe(EVALUATION_TRIGGER_NODE_TYPE);
		expect(evalTrigger.parameters.source).toBe('dataTable');
		expect(evalTrigger.parameters.dataTableId).toBe('dt-1');

		// The user trigger's edge to Agent is removed; __eval_trigger now feeds Agent.
		expect(compiled.connections.UserTrigger).toBeUndefined();
		expect(compiled.connections.__eval_trigger).toEqual({
			main: [[{ node: 'Agent', type: 'main', index: 0 }]],
		});
		expect(compiled.connections.Agent).toEqual({
			main: [[{ node: '__eval_metric_m-expr', type: 'main', index: 0 }]],
		});
	});

	it('rewrites expressions that reference the replaced upstream node', () => {
		const wf = baseWorkflow();
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-expr',
				name: 'Latency OK',
				type: 'expression',
				config: {
					expression: '={{ $("UserTrigger").item.json.question.length > 0 }}',
					outputType: 'boolean',
				},
			},
		];

		const compiled = compiler.compile(wf, config);
		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-expr')!;
		const assignedValue = (metric.parameters.metrics as { assignments: Array<{ value: string }> })
			.assignments[0].value;
		// The reference was rewritten to __eval_trigger; boolean coercion still wraps it.
		expect(assignedValue).toContain('$("__eval_trigger")');
		expect(assignedValue).not.toContain('$("UserTrigger")');
	});

	it('errors when no upstream node exists on the entry chain', () => {
		const wf = baseWorkflow();
		wf.connections = {};
		expect(() => compiler.compile(wf, baseConfig())).toThrow(/No incoming connection/);
	});

	it('passes numeric expression metrics through without coercion', () => {
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-num',
				name: 'Latency ms',
				type: 'expression',
				config: { expression: '={{ $json.duration }}', outputType: 'numeric' },
			},
		];

		const compiled = compiler.compile(baseWorkflow(), config);
		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-num')!;
		expect(
			(metric.parameters.metrics as { assignments: Array<{ value: string }> }).assignments[0].value,
		).toBe('={{ $json.duration }}');
	});

	it('injects an llm_judge metric node plus its chat-model sub-node wired via ai_languageModel', () => {
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-judge',
				name: 'Answer correctness',
				type: 'llm_judge',
				config: {
					preset: 'correctness',
					prompt: 'You are a judge',
					provider: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
					credentialId: 'cred-anth',
					model: 'claude-sonnet-4-6',
					outputType: 'numeric',
					inputs: {
						actualAnswer: '={{ $("Agent").item.json.output }}',
						expectedAnswer: '={{ $json.expected }}',
					},
				},
			},
		];

		const compiled = compiler.compile(baseWorkflow(), config);

		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-judge')!;
		expect(metric.parameters.metric).toBe('correctness');
		expect(metric.parameters.prompt).toBe('You are a judge');
		expect(metric.parameters.actualAnswer).toBe('={{ $("Agent").item.json.output }}');
		// expectedAnswer is a dataset column → retargeted to the eval trigger.
		expect(metric.parameters.expectedAnswer).toBe("={{ $('__eval_trigger').item.json.expected }}");
		expect(metric.parameters.options).toEqual({ metricName: 'Answer correctness' });

		const model = compiled.nodes.find((n) => n.name === '__eval_model_m-judge')!;
		expect(model.type).toBe('@n8n/n8n-nodes-langchain.lmChatAnthropic');
		expect(model.typeVersion).toBe(ANTHROPIC_DESCRIPTION.defaultVersion);
		expect(model.parameters.model).toEqual({
			__rl: true,
			mode: 'list',
			value: 'claude-sonnet-4-6',
			cachedResultName: 'claude-sonnet-4-6',
		});
		expect(model.credentials).toEqual({ anthropicApi: { id: 'cred-anth', name: '' } });

		expect(compiled.connections['__eval_model_m-judge']).toEqual({
			ai_languageModel: [[{ node: '__eval_metric_m-judge', type: 'ai_languageModel', index: 0 }]],
		});
	});

	it('omits prompt from the compiled llm_judge node when not overridden in the config', () => {
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-judge',
				name: 'Correctness',
				type: 'llm_judge',
				config: {
					preset: 'correctness',
					// prompt intentionally omitted — node should fall back to the
					// canned prompt declared on the Set Metrics node schema.
					provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					credentialId: 'cred',
					model: 'gpt-4o-mini',
					outputType: 'numeric',
					inputs: { actualAnswer: '={{ $json }}', expectedAnswer: '={{ $json.expected }}' },
				},
			},
		];

		const compiled = compiler.compile(baseWorkflow(), config);
		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-judge')!;
		expect(metric.parameters).not.toHaveProperty('prompt');
		expect(metric.parameters.metric).toBe('correctness');
	});

	describe('llm-judge chat-model sub-node shape', () => {
		it('emits the sub-node at the provider default version with a resource-locator model when the node expects one', () => {
			const compiled = compiler.compile(
				baseWorkflow(),
				llmJudgeConfig('@n8n/n8n-nodes-langchain.lmChatAnthropic', 'claude-sonnet-4-6'),
			);
			const model = compiled.nodes.find((n) => n.name === '__eval_model_m-judge')!;
			expect(model.typeVersion).toBe(ANTHROPIC_DESCRIPTION.defaultVersion);
			expect(model.parameters.model).toEqual({
				__rl: true,
				mode: 'list',
				value: 'claude-sonnet-4-6',
				cachedResultName: 'claude-sonnet-4-6',
			});
		});

		it('emits a plain-string model at the provider default version when the node model is not a resource locator', () => {
			const compiled = compiler.compile(
				baseWorkflow(),
				llmJudgeConfig('@n8n/n8n-nodes-langchain.lmChatOllama', 'llama3'),
			);
			const model = compiled.nodes.find((n) => n.name === '__eval_model_m-judge')!;
			expect(model.typeVersion).toBe(OLLAMA_DESCRIPTION.version);
			expect(model.parameters.model).toBe('llama3');
		});

		it('falls back to typeVersion 1 with a string model when the provider node type cannot be introspected', () => {
			// lmChatOpenAi is a registered provider but absent from the node-type double.
			const compiled = compiler.compile(
				baseWorkflow(),
				llmJudgeConfig('@n8n/n8n-nodes-langchain.lmChatOpenAi', 'gpt-4o'),
			);
			const model = compiled.nodes.find((n) => n.name === '__eval_model_m-judge')!;
			expect(model.typeVersion).toBe(1);
			expect(model.parameters.model).toBe('gpt-4o');
		});
	});

	it('compiles a string_similarity metric to a setMetrics node with metric=stringSimilarity', () => {
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-ss',
				name: 'Edit-distance score',
				type: 'string_similarity',
				config: {
					inputs: {
						actualAnswer: '={{ $json.output }}',
						expectedAnswer: '={{ $json.expected }}',
					},
				},
			},
		];

		const compiled = compiler.compile(baseWorkflow(), config);
		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-ss')!;
		expect(metric.parameters.operation).toBe('setMetrics');
		expect(metric.parameters.metric).toBe('stringSimilarity');
		// actualAnswer stays on the output; expectedAnswer is a dataset column.
		expect(metric.parameters.actualAnswer).toBe('={{ $json.output }}');
		expect(metric.parameters.expectedAnswer).toBe("={{ $('__eval_trigger').item.json.expected }}");
		expect(metric.parameters.options).toEqual({ metricName: 'Edit-distance score' });

		// No chat-model sub-node for deterministic scorers.
		expect(compiled.nodes.find((n) => n.name === '__eval_model_m-ss')).toBeUndefined();
	});

	it('compiles a categorization metric to a setMetrics node with metric=categorization', () => {
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-cat',
				name: 'Exact-match category',
				type: 'categorization',
				config: {
					inputs: {
						actualAnswer: '={{ $json.label }}',
						expectedAnswer: '={{ $json.expectedLabel }}',
					},
				},
			},
		];

		const compiled = compiler.compile(baseWorkflow(), config);
		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-cat')!;
		expect(metric.parameters.metric).toBe('categorization');
		expect(metric.parameters.actualAnswer).toBe('={{ $json.label }}');
		expect(metric.parameters.expectedAnswer).toBe(
			"={{ $('__eval_trigger').item.json.expectedLabel }}",
		);
	});

	it('compiles a tools_used metric to a setMetrics node with metric=toolsUsed', () => {
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-tools',
				name: 'Tools coverage',
				type: 'tools_used',
				config: {
					inputs: {
						expectedTools: 'Search, Calculator',
						intermediateSteps: '={{ $("Agent").item.json.intermediateSteps }}',
					},
				},
			},
		];

		const compiled = compiler.compile(baseWorkflow(), config);
		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-tools')!;
		expect(metric.parameters.metric).toBe('toolsUsed');
		// A literal tool list has no `$json` base, so it is left untouched.
		expect(metric.parameters.expectedTools).toBe('Search, Calculator');
		expect(metric.parameters.intermediateSteps).toBe(
			'={{ $("Agent").item.json.intermediateSteps }}',
		);
	});

	it('retargets a helpfulness userQuery to the dataset row while leaving actualAnswer on the output', () => {
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-help',
				name: 'Helpfulness',
				type: 'llm_judge',
				config: {
					preset: 'helpfulness',
					provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					credentialId: 'cred',
					model: 'gpt-4o',
					outputType: 'numeric',
					// Authored as if $json were the dataset row (what the IAI produces);
					// at the metric node $json is actually the end-node output.
					inputs: { actualAnswer: '={{ $json.output }}', userQuery: '={{ $json.chatInput }}' },
				},
			},
		];

		const compiled = compiler.compile(baseWorkflow(), config);
		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-help')!;
		// userQuery reads a dataset column → resolved against the trigger row.
		expect(metric.parameters.userQuery).toBe("={{ $('__eval_trigger').item.json.chatInput }}");
		// actualAnswer is the produced answer → stays on the metric node's own input.
		expect(metric.parameters.actualAnswer).toBe('={{ $json.output }}');
	});

	it('leaves an explicit node reference in a dataset-sourced field untouched', () => {
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-help2',
				name: 'Helpfulness',
				type: 'llm_judge',
				config: {
					preset: 'helpfulness',
					provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					credentialId: 'cred',
					model: 'gpt-4o',
					outputType: 'numeric',
					inputs: {
						actualAnswer: '={{ $json.output }}',
						// Already anchored to a specific node — no bare $json to retarget.
						userQuery: '={{ $("Some Upstream").item.json.q }}',
					},
				},
			},
		];

		const compiled = compiler.compile(baseWorkflow(), config);
		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-help2')!;
		expect(metric.parameters.userQuery).toBe('={{ $("Some Upstream").item.json.q }}');
	});

	it('leaves a fixed literal dataset value untouched even when it contains "$json"', () => {
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm-ss-lit',
				name: 'Similarity',
				type: 'string_similarity',
				config: {
					inputs: {
						actualAnswer: '={{ $json.output }}',
						// Fixed literal (no leading `=`) — `$json` here is plain text.
						expectedAnswer: 'the $json field holds the answer',
					},
				},
			},
		];

		const compiled = compiler.compile(baseWorkflow(), config);
		const metric = compiled.nodes.find((n) => n.name === '__eval_metric_m-ss-lit')!;
		expect(metric.parameters.expectedAnswer).toBe('the $json field holds the answer');
	});

	it('supports startNodeName != endNodeName (middle slice)', () => {
		const wf = baseWorkflow();
		wf.nodes.push({
			id: 'n-post',
			name: 'Post',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [400, 0],
			parameters: {},
		});
		wf.connections.Agent = { main: [[{ node: 'Post', type: 'main', index: 0 }]] };

		const config = baseConfig();
		config.startNodeName = 'Agent';
		config.endNodeName = 'Post';

		const compiled = compiler.compile(wf, config);

		// UserTrigger stays as-is; __eval_trigger is inserted and now feeds Agent directly.
		const userTrigger = compiled.nodes.find((n) => n.name === 'UserTrigger')!;
		expect(userTrigger.type).toBe('n8n-nodes-base.manualTrigger');
		expect(compiled.connections.UserTrigger).toBeUndefined();
		expect(compiled.connections.__eval_trigger).toEqual({
			main: [[{ node: 'Agent', type: 'main', index: 0 }]],
		});
		expect(compiled.connections.Post).toEqual({
			main: [[{ node: '__eval_metric_m-expr', type: 'main', index: 0 }]],
		});
	});

	it('positions metric and model nodes relative to the end node', () => {
		const wf = baseWorkflow();
		// Agent sits at [200, 0] per baseWorkflow
		const config = baseConfig();
		config.metrics = [
			{
				id: 'm1',
				name: 'A',
				type: 'expression',
				config: { expression: '={{ 1 }}', outputType: 'numeric' },
			},
			{
				id: 'm2',
				name: 'B',
				type: 'llm_judge',
				config: {
					preset: 'correctness',
					prompt: 'p',
					provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					credentialId: 'c',
					model: 'gpt-4o',
					outputType: 'numeric',
					inputs: {
						actualAnswer: '={{ $json.a }}',
						expectedAnswer: '={{ $json.e }}',
					},
				},
			},
		];

		const compiled = compiler.compile(wf, config);

		// User trigger stays put; __eval_trigger anchors to the left of entry (Agent at x=200).
		const userTrigger = compiled.nodes.find((n) => n.name === 'UserTrigger')!;
		expect(userTrigger.position).toEqual([0, 0]);
		const evalTrigger = compiled.nodes.find((n) => n.name === '__eval_trigger')!;
		expect(evalTrigger.position).toEqual([-20, 0]); // Agent(200) - NODE_STEP_X(220)

		// Metric nodes anchor to the right of the rightmost user node (Agent at x=200)
		// plus METRIC_COLUMN_GAP (440). Row heights differ by metric type: expression
		// rows are 140 tall, llm_judge rows are 380 tall (room for the sub-node below).
		const metric1 = compiled.nodes.find((n) => n.name === '__eval_metric_m1')!;
		const metric2 = compiled.nodes.find((n) => n.name === '__eval_metric_m2')!;
		expect(metric1.position).toEqual([640, 0]);
		expect(metric2.position).toEqual([640, 140]); // after expression row

		// Model sub-node sits below its metric by MODEL_OFFSET_Y (220).
		const model = compiled.nodes.find((n) => n.name === '__eval_model_m2')!;
		expect(model.position).toEqual([640, 360]);
	});

	it('drops endNode downstream main connections so post-end nodes do not execute', () => {
		const wf = baseWorkflow();
		wf.nodes.push({
			id: 'n-after-end',
			name: 'AfterEnd',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [400, 0],
			parameters: {},
		});
		wf.connections.Agent = { main: [[{ node: 'AfterEnd', type: 'main', index: 0 }]] };

		const compiled = compiler.compile(wf, baseConfig());

		expect(compiled.connections.Agent).toEqual({
			main: [[{ node: '__eval_metric_m-expr', type: 'main', index: 0 }]],
		});
		// The post-end node still exists as a node but must not be wired downstream of the slice
		expect(Object.keys(compiled.connections)).not.toContain('AfterEnd');
	});

	it('preserves non-main sub-node connections on the end node (e.g. ai_languageModel)', () => {
		const wf = baseWorkflow();
		// Pre-existing agent → model wire on the end node; must survive compilation.
		wf.connections.Agent = {
			main: [[{ node: 'ExistingNext', type: 'main', index: 0 }]],
			ai_languageModel: [[{ node: 'SomeModel', type: 'ai_languageModel', index: 0 }]],
		};

		const compiled = compiler.compile(wf, baseConfig());

		expect(compiled.connections.Agent.ai_languageModel).toEqual([
			[{ node: 'SomeModel', type: 'ai_languageModel', index: 0 }],
		]);
		expect(compiled.connections.Agent.main).toEqual([
			[{ node: '__eval_metric_m-expr', type: 'main', index: 0 }],
		]);
	});

	it('rejects workflows already using the __eval_ prefix', () => {
		const wf = baseWorkflow();
		wf.nodes.push({
			id: 'x',
			name: '__eval_something',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		expect(() => compiler.compile(wf, baseConfig())).toThrow(/reserved/);
	});

	it('rejects workflows whose trigger has multiple downstream nodes when startNodeName is unset', () => {
		const wf = baseWorkflow();
		wf.nodes.push({
			id: 'n-b',
			name: 'Branch',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [200, 100],
			parameters: {},
		});
		wf.connections.UserTrigger = {
			main: [
				[
					{ node: 'Agent', type: 'main', index: 0 },
					{ node: 'Branch', type: 'main', index: 0 },
				],
			],
		};
		const config = baseConfig();
		config.startNodeName = '';
		expect(() => compiler.compile(wf, config)).toThrow(/multiple downstream/);
	});

	describe('refinements (spec §7)', () => {
		it('resolves LLM-judge credentials via the provider registry (not a hardcoded map)', () => {
			const config = baseConfig();
			config.metrics = [
				{
					id: 'm-llm',
					name: 'Helpful',
					type: 'llm_judge',
					config: {
						preset: 'correctness',
						prompt: 'Judge it',
						provider: '@n8n/n8n-nodes-langchain.lmChatGroq',
						credentialId: 'cred-grok',
						model: 'llama3-8b-8192',
						outputType: 'numeric',
						inputs: { actualAnswer: '={{$json.a}}', expectedAnswer: '={{$json.b}}' },
					},
				},
			];

			const compiled = compiler.compile(baseWorkflow(), config);
			const modelNode = compiled.nodes.find((n) => n.name === '__eval_model_m-llm');
			expect(modelNode).toBeDefined();
			expect(Object.keys(modelNode!.credentials ?? {})).toEqual(['groqApi']);
			expect(modelNode!.credentials).toEqual({ groqApi: { id: 'cred-grok', name: '' } });
		});

		it('throws when an LLM-judge provider is not in the registry', () => {
			const config = baseConfig();
			config.metrics = [
				{
					id: 'm-bad',
					name: 'Bad',
					type: 'llm_judge',
					config: {
						preset: 'correctness',
						prompt: 'Judge it',
						provider: '@n8n/n8n-nodes-langchain.lmChatNotReal',
						credentialId: 'cred',
						model: 'm',
						outputType: 'numeric',
						inputs: { actualAnswer: '={{$json.a}}', expectedAnswer: '={{$json.b}}' },
					},
				},
			];
			expect(() => compiler.compile(baseWorkflow(), config)).toThrow(
				/Unsupported LLM judge provider/,
			);
		});

		it('throws BOOLEAN_COERCION_UNSUPPORTED-style error for multi-segment boolean expressions', () => {
			const config = baseConfig();
			config.metrics = [
				{
					id: 'm-mix',
					name: 'Mix',
					type: 'expression',
					config: { expression: '=foo {{$json.a}} bar {{$json.b}}', outputType: 'boolean' },
				},
			];
			expect(() => compiler.compile(baseWorkflow(), config)).toThrow(
				/cannot be coerced into a boolean/,
			);
		});

		it('preserves multi-bucket main outputs on the end node (IF/Switch)', () => {
			// End node has two main buckets (e.g., IF: true and false branches),
			// each previously feeding into a downstream user node. After compile,
			// each bucket should fan out to the metric edges so metrics fire on
			// whichever branch executes.
			const wf: IWorkflowBase = {
				...baseWorkflow(),
				nodes: [
					...baseWorkflow().nodes,
					{
						id: 'n-true',
						name: 'AfterTrue',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [400, -50],
						parameters: {},
					},
					{
						id: 'n-false',
						name: 'AfterFalse',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [400, 50],
						parameters: {},
					},
				],
				connections: {
					UserTrigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
					Agent: {
						main: [
							[{ node: 'AfterTrue', type: 'main', index: 0 }],
							[{ node: 'AfterFalse', type: 'main', index: 0 }],
						],
					},
				},
			};

			const compiled = compiler.compile(wf, baseConfig());
			const endMain = compiled.connections.Agent.main;
			expect(endMain).toBeDefined();
			expect(endMain.length).toBe(2);
			for (const bucket of endMain) {
				expect(bucket?.map((e) => e?.node)).toEqual(['__eval_metric_m-expr']);
			}
		});

		it('falls through to single-bucket fan-out when the end node had no outgoing main edges', () => {
			const compiled = compiler.compile(baseWorkflow(), baseConfig());
			const endMain = compiled.connections.Agent.main;
			expect(endMain.length).toBe(1);
			expect(endMain[0]?.[0]?.node).toBe('__eval_metric_m-expr');
		});
	});

	describe('pre-existing evaluation nodes (TRUST-166)', () => {
		// A complete workflow (UserTrigger -> Agent) that also gained evaluation
		// nodes on top: an EvaluationTrigger feeding the entry, a Set Metrics node
		// after it, and an "Is evaluation run" check node.
		function workflowWithExistingEvalNodes(): IWorkflowBase {
			return {
				...baseWorkflow(),
				connections: {
					UserTrigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
					'Old Eval Trigger': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
					Agent: { main: [[{ node: 'Old Set Metrics', type: 'main', index: 0 }]] },
				},
				nodes: [
					...baseWorkflow().nodes,
					{
						id: 'n-old-trigger',
						name: 'Old Eval Trigger',
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 4.6,
						position: [0, 200],
						parameters: {},
					},
					{
						id: 'n-old-metrics',
						name: 'Old Set Metrics',
						type: 'n8n-nodes-base.evaluation',
						typeVersion: 4.7,
						position: [400, 0],
						parameters: { operation: 'setMetrics' },
					},
					{
						id: 'n-is-eval',
						name: 'Is Eval Run',
						type: 'n8n-nodes-base.evaluation',
						typeVersion: 4.7,
						position: [200, 200],
						parameters: { operation: 'checkIfEvaluating' },
					},
				],
			} as unknown as IWorkflowBase;
		}

		it('removes a pre-existing EvaluationTrigger and prunes its connections', () => {
			const compiled = compiler.compile(workflowWithExistingEvalNodes(), baseConfig());

			expect(compiled.nodes.find((n) => n.name === 'Old Eval Trigger')).toBeUndefined();
			expect(compiled.connections['Old Eval Trigger']).toBeUndefined();
			// The workflow's own trigger is rewired to __eval_trigger as usual.
			expect(compiled.connections.__eval_trigger).toEqual({
				main: [[{ node: 'Agent', type: 'main', index: 0 }]],
			});
		});

		it('disables Set Metrics nodes instead of removing them (structure preserved)', () => {
			const compiled = compiler.compile(workflowWithExistingEvalNodes(), baseConfig());

			const oldMetrics = compiled.nodes.find((n) => n.name === 'Old Set Metrics');
			expect(oldMetrics).toBeDefined();
			expect(oldMetrics!.disabled).toBe(true);
		});

		it('leaves "Is evaluation run" (checkIfEvaluating) nodes untouched', () => {
			const compiled = compiler.compile(workflowWithExistingEvalNodes(), baseConfig());

			const isEval = compiled.nodes.find((n) => n.name === 'Is Eval Run');
			expect(isEval).toBeDefined();
			expect(isEval!.disabled).toBeUndefined();
		});
	});
});
