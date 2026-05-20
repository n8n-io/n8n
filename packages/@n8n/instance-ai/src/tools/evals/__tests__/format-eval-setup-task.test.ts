import { currentJsonExpression, nodeItemJsonExpression } from '../column-ref-utils';
import { formatEvalSetupTask } from '../format-eval-setup-task';
import { METRIC_CATALOG } from '../metric-catalog';

const BASE = {
	workflowId: 'w1',
	workflowName: 'Telegram AI Q&A Bot',
	detectedAiNodes: ['General Agent'],
	datasetChoice: 'create-empty' as const,
	suggestedInputColumns: ['user_message'],
	suggestedOutputColumns: ['agent_response'],
	enabledMetrics: [
		{
			id: 'correctness',
			name: 'Correctness',
			kind: 'llm-judge' as const,
			description: 'Factual correctness of the response.',
			prompt: 'Judge if the response is correct.',
			cannedMetricKey: 'correctness',
			defaultEnabled: true,
		},
	],
};

describe('formatEvalSetupTask — PRODUCTION ADAPTER section', () => {
	it('omits the section when namedRefs is empty or undefined', () => {
		const task = formatEvalSetupTask(BASE);
		expect(task).not.toMatch(/PRODUCTION ADAPTER/);
	});

	it('emits the PRODUCTION ADAPTER section when namedRefs is non-empty', () => {
		const task = formatEvalSetupTask({
			...BASE,
			namedRefs: [
				{
					nodeName: 'Voice or Text',
					field: 'text',
					originalExpression: "$('Voice or Text').item.json.text",
					column: 'text',
					targetNodeName: 'General Agent',
				},
			],
		});
		expect(task).toMatch(/PRODUCTION ADAPTER/);
		expect(task).toMatch(/Voice or Text/);
		expect(task).toMatch(/name: "text"/);
	});

	it('emits adapter assignments and rewrites for nested direct refs', () => {
		const task = formatEvalSetupTask({
			...BASE,
			suggestedInputColumns: ['message.text', 'message.chat.id'],
			directRefs: [
				{
					field: 'message.text',
					originalExpression: '$json.message.text',
					column: 'message.text',
					targetNodeName: 'General Agent',
				},
				{
					field: 'message.chat.id',
					originalExpression: '$json.message.chat.id',
					column: 'message.chat.id',
					targetNodeName: 'Postgres Memory',
				},
			],
		});

		expect(task).toMatch(/PRODUCTION ADAPTER/);
		expect(task).toContain('- message_text');
		expect(task).toContain('- message_chat_id');
		expect(task).toContain('value: "={{ $json.message.text }}"');
		expect(task).toContain('value: "={{ $json.message.chat.id }}"');
		expect(task).toContain('Replace `$json.message.text` with `{{ $json.message_text }}`');
		expect(task).toContain('Replace `$json.message.chat.id` with `{{ $json.message_chat_id }}`');
	});

	it('does not add an adapter for top-level direct refs that already match dataset columns', () => {
		const task = formatEvalSetupTask({
			...BASE,
			suggestedInputColumns: ['user_query'],
			directRefs: [
				{
					field: 'user_query',
					originalExpression: '$json.user_query',
					column: 'user_query',
					targetNodeName: 'General Agent',
				},
			],
		});

		expect(task).not.toMatch(/PRODUCTION ADAPTER/);
	});

	it('groups rewrites by target node when refs span agent + sub-component', () => {
		const task = formatEvalSetupTask({
			...BASE,
			suggestedInputColumns: ['text', 'sender_id'],
			detectedAiNodes: ['Agent'],
			namedRefs: [
				{
					nodeName: 'Voice or Text',
					field: 'text',
					originalExpression: "$('Voice or Text').item.json.text",
					column: 'text',
					targetNodeName: 'Agent',
				},
				{
					nodeName: 'Sender ID',
					field: 'id',
					originalExpression: "$('Sender ID').item.json.id",
					column: 'sender_id',
					targetNodeName: 'Postgres Memory',
				},
			],
		});
		expect(task).toMatch(/In `Agent`:[\s\S]*Replace `\$\('Voice or Text'\)/);
		expect(task).toMatch(/In `Postgres Memory`:[\s\S]*Replace `\$\('Sender ID'\)/);
	});

	it('agent rewrites use $json.<col> form', () => {
		const task = formatEvalSetupTask({
			...BASE,
			detectedAiNodes: ['Chef Agent'],
			namedRefs: [
				{
					nodeName: 'Voice or Text',
					field: 'text',
					originalExpression: "$('Voice or Text').item.json.text",
					column: 'text',
					targetNodeName: 'Chef Agent',
				},
			],
		});
		expect(task).toMatch(
			/Replace `\$\('Voice or Text'\)\.item\.json\.text` with `\{\{ \$json\.text \}\}`/,
		);
	});

	it('sub-component rewrites use the shared $json.<col> input shape', () => {
		const task = formatEvalSetupTask({
			...BASE,
			detectedAiNodes: ['Chef Agent'],
			suggestedInputColumns: ['sender_id'],
			namedRefs: [
				{
					nodeName: 'Sender ID',
					field: 'id',
					originalExpression: "$('Sender ID').item.json.id",
					column: 'sender_id',
					targetNodeName: 'Postgres Memory',
				},
			],
		});
		expect(task).toContain("Replace `$('Sender ID').item.json.id` with `{{ $json.sender_id }}`");
		expect(task).not.toMatch(/In `Postgres Memory`:[\s\S]*\$\('Chef Agent'\)/);
	});

	it('escapes generated adapter assignments and rewrite expressions', () => {
		const sourceNodeName = 'Voice "or" Text';
		const sourceField = 'message-id';
		const agentNodeName = "Chef's Agent";
		const column = 'user-message';
		const task = formatEvalSetupTask({
			...BASE,
			detectedAiNodes: ['Other Agent', agentNodeName],
			targetAgentNodeName: agentNodeName,
			suggestedInputColumns: [column],
			namedRefs: [
				{
					nodeName: sourceNodeName,
					field: sourceField,
					originalExpression: '$("Voice \\"or\\" Text").item.json["message-id"]',
					column,
					targetNodeName: agentNodeName,
				},
				{
					nodeName: 'Sender',
					field: 'sender-id',
					originalExpression: '$("Sender").item.json["sender-id"]',
					column: 'sender-id',
					targetNodeName: 'Postgres Memory',
				},
			],
		});

		expect(task).toContain(
			`value: ${JSON.stringify(`={{ ${nodeItemJsonExpression(sourceNodeName, sourceField)} }}`)}`,
		);
		expect(task).toContain(`with \`{{ ${currentJsonExpression('user_message')} }}\``);
		expect(task).toContain(`with \`{{ ${currentJsonExpression('sender_id')} }}\``);
	});
});

describe('formatEvalSetupTask — dataset and setOutputs instructions', () => {
	it('normalizes DataTable columns and rewrites expressions to the normalized names', () => {
		const task = formatEvalSetupTask({
			...BASE,
			suggestedInputColumns: ['User Query'],
			suggestedOutputColumns: ['expected-response'],
			enabledMetrics: [
				{
					id: 'correctness',
					name: 'Correctness',
					kind: 'llm-judge',
					description: 'Factual correctness of the response.',
					prompt: 'Judge if the response is correct.',
					cannedMetricKey: 'correctness',
					defaultEnabled: true,
				},
			],
			namedRefs: [
				{
					nodeName: 'Webhook',
					field: 'User Query',
					originalExpression: '$("Webhook").item.json["User Query"]',
					column: 'User Query',
					targetNodeName: 'General Agent',
				},
			],
		});

		expect(task).toContain('Create an empty DataTable named "Telegram AI Q&A Bot — eval samples"');
		expect(task).toContain('Columns to create as strings:\n- user_query\n- expected_response');
		expect(task).toContain(
			`value: ${JSON.stringify(`={{ ${nodeItemJsonExpression('Webhook', 'User Query')} }}`)}`,
		);
		expect(task).toContain(
			'Replace `$("Webhook").item.json["User Query"]` with `{{ $json.user_query }}`',
		);
		expect(task).toContain("expectedAnswer: ={{ $('Eval Trigger').item.json.expected_response }}");
		expect(task).not.toContain('Telegram AI Q&A Bot eval dataset');
		expect(task).not.toContain('- User Query');
		expect(task).not.toContain('- expected-response');
	});

	it('keeps dataTableId unconfigured when the user chose to wire data later', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'later',
		});

		expect(task).toContain('Leave setOutputs dataTableId empty until the user selects a DataTable');
		expect(task).not.toContain("value: '<same as EvaluationTrigger>'");
	});
});

describe('formatEvalSetupTask — metric instructions', () => {
	it('maps tool_use to the native toolsUsed metric parameter', () => {
		const task = formatEvalSetupTask({
			...BASE,
			enabledMetrics: [
				{
					id: 'tool_use',
					name: 'Tool use',
					kind: 'llm-judge',
					description: 'Tool choice',
					prompt: 'Check tools.',
					cannedMetricKey: 'tool_use',
					defaultEnabled: false,
				},
			],
		});

		expect(task).toContain("metric: 'toolsUsed'");
		expect(task).toContain('expectedTools');
		expect(task).toContain('intermediateSteps');
		expect(task).not.toContain("metric: 'tool_use'");
	});

	it('does not instruct builders to use a non-existent relevance metric parameter', () => {
		const task = formatEvalSetupTask({
			...BASE,
			enabledMetrics: [
				{
					id: 'relevance',
					name: 'Relevance',
					kind: 'llm-judge',
					description: 'Context relevance',
					prompt: 'Check relevance.',
					cannedMetricKey: 'relevance',
					defaultEnabled: false,
				},
			],
		});

		expect(task).toContain("metric: 'helpfulness'");
		expect(task).toContain('There is no native `relevance` metric option');
		expect(task).not.toContain("metric: 'relevance'");
	});
});

describe('formatEvalSetupTask — metric setup instructions', () => {
	it('configures helpfulness with userQuery and actualAnswer', () => {
		const task = formatEvalSetupTask({
			...BASE,
			suggestedInputColumns: ['user_query'],
			suggestedOutputColumns: [],
			enabledMetrics: [METRIC_CATALOG.helpfulness],
		});

		expect(task).toContain("metric: 'helpfulness'");
		expect(task).toContain('userQuery');
		expect(task).toContain("{{ $('Eval Trigger').item.json.user_query }}");
		expect(task).toContain('actualAnswer');
		expect(task).not.toContain('For each metric, set `expectedAnswer`');
	});

	it('configures tool use with expectedTools and intermediateSteps', () => {
		const task = formatEvalSetupTask({
			...BASE,
			suggestedOutputColumns: ['expected_tools'],
			enabledMetrics: [METRIC_CATALOG.tool_use],
		});

		expect(task).toContain("metric: 'toolsUsed'");
		expect(task).toContain('expectedTools');
		expect(task).toContain("{{ $('Eval Trigger').item.json.expected_tools }}");
		expect(task).toContain('intermediateSteps');
		expect(task).toMatch(/returning intermediate steps/i);
	});
});
