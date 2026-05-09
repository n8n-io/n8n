import type { EvaluationConfig } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';

import { LlmJudgeProviderRegistry } from '../../llm-judge-provider-registry';
import { WorkflowCompilerService } from '../workflow-compiler.service';

const EVALUATION_TRIGGER_NODE_TYPE = 'n8n-nodes-base.evaluationTrigger';

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

describe('WorkflowCompilerService', () => {
	let compiler: WorkflowCompilerService;

	beforeEach(() => {
		compiler = new WorkflowCompilerService(new LlmJudgeProviderRegistry());
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
		expect(metric.parameters.expectedAnswer).toBe('={{ $json.expected }}');
		expect(metric.parameters.options).toEqual({ metricName: 'Answer correctness' });

		const model = compiled.nodes.find((n) => n.name === '__eval_model_m-judge')!;
		expect(model.type).toBe('@n8n/n8n-nodes-langchain.lmChatAnthropic');
		expect(model.parameters.model).toBe('claude-sonnet-4-6');
		expect(model.credentials).toEqual({ anthropicApi: { id: 'cred-anth', name: '' } });

		expect(compiled.connections['__eval_model_m-judge']).toEqual({
			ai_languageModel: [[{ node: '__eval_metric_m-judge', type: 'ai_languageModel', index: 0 }]],
		});
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
});
