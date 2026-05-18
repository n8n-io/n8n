import { formatEvalSetupTask, type FormatEvalSetupTaskInput } from '../format-eval-setup-task';

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
} satisfies FormatEvalSetupTaskInput;

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

	it("sub-component rewrites use $('<AgentName>').item.json.<col> form, not $json", () => {
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
		expect(task).toMatch(
			/Replace `\$\('Sender ID'\)\.item\.json\.id` with `\{\{ \$\("Chef Agent"\)\.item\.json\.sender_id \}\}`/,
		);
		// Sub-component must not fall back to plain $json.<col>
		expect(task).not.toMatch(/In `Postgres Memory`:[\s\S]*\{\{ \$json\.sender_id \}\}/);
	});

	it('escapes node names in generated expressions', () => {
		const task = formatEvalSetupTask({
			...BASE,
			detectedAiNodes: ["Chef's Agent"],
			namedRefs: [
				{
					nodeName: "User's Input",
					field: 'text',
					originalExpression: '$("User\'s Input").item.json.text',
					column: 'text',
					targetNodeName: "Chef's Agent",
				},
				{
					nodeName: "Sender's ID",
					field: 'id',
					originalExpression: '$("Sender\'s ID").item.json.id',
					column: 'sender_id',
					targetNodeName: 'Postgres Memory',
				},
			],
		});

		expect(task).toContain('value: "={{ $("User\'s Input").item.json.text }}"');
		expect(task).toContain('{{ $("Chef\'s Agent").item.json.sender_id }}');
		expect(task).not.toContain("$('User's Input')");
		expect(task).not.toContain("$('Chef's Agent')");
	});
});

describe('formatEvalSetupTask — dataset and setOutputs instructions', () => {
	it('uses the same DataTable name as the create-empty-eval-data-table tool', () => {
		const task = formatEvalSetupTask(BASE);

		expect(task).toContain('Create an empty DataTable named "Telegram AI Q&A Bot — eval samples"');
		expect(task).not.toContain('Telegram AI Q&A Bot eval dataset');
	});

	it('does not emit a placeholder dataTableId for newly-created tables', () => {
		const task = formatEvalSetupTask(BASE);

		expect(task).toContain('using the id returned by `create-empty-eval-data-table`');
		expect(task).not.toContain("value: '<same as EvaluationTrigger>'");
	});

	it('uses the existing table id when linking an existing DataTable', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'link-existing',
			existingDataTableId: 'dt-123',
		});

		expect(task).toContain("dataTableId: { mode: 'id', value: 'dt-123' }");
	});

	it('keeps dataTableId unconfigured when the user chose to wire data later', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'later',
		});

		expect(task).toContain('Leave setOutputs dataTableId empty until the user selects a DataTable');
		expect(task).not.toContain("value: '<same as EvaluationTrigger>'");
	});

	it('normalizes DataTable columns and uses bracket access for source fields that need it', () => {
		const task = formatEvalSetupTask({
			...BASE,
			suggestedInputColumns: ['User Query'],
			suggestedOutputColumns: ['expected-response'],
			enabledMetrics: [
				{
					id: 'helpfulness',
					name: 'Helpfulness',
					kind: 'llm-judge',
					description: 'Helpful response',
					prompt: 'Check helpfulness.',
					cannedMetricKey: 'helpfulness',
					defaultEnabled: false,
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

		expect(task).toContain('Columns to create as strings:\n- user_query\n- expected_response');
		expect(task).toContain('value: "={{ $("Webhook").item.json["User Query"] }}"');
		expect(task).toContain(
			'Replace `$("Webhook").item.json["User Query"]` with `{{ $json.user_query }}`',
		);
		expect(task).toContain('userQuery: ={{ $("Eval Trigger").item.json.user_query }}');
		expect(task).not.toContain('- User Query');
		expect(task).not.toContain('- expected-response');
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
		expect(task).toContain("not `'tool_use'`");
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
