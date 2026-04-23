import { formatEvalSetupTask } from '../format-eval-setup-task';

const BASE = {
	workflowId: 'w1',
	workflowName: 'Telegram AI Q&A Bot',
	detectedAiNodes: ['General Agent'],
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

describe('formatEvalSetupTask', () => {
	it('includes workflow id and name, and detected AI nodes', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'generate',
			projectId: 'p1',
		});
		expect(task).toContain('w1');
		expect(task).toContain('Telegram AI Q&A Bot');
		expect(task).toContain('General Agent');
	});

	it('dataset=generate: instructs sub-agent to create DataTable with expected name', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'generate',
			projectId: 'p1',
		});
		expect(task).toContain('Create a new DataTable');
		expect(task).toContain('Telegram AI Q&A Bot — eval samples');
		expect(task).toContain('5-7 realistic sample rows');
	});

	it('dataset=generate: lists input+output columns for DataTable schema', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'generate',
			projectId: 'p1',
		});
		expect(task).toContain('user_message');
		expect(task).toContain('agent_response');
	});

	it('dataset=generate: includes project id when provided', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'generate',
			projectId: 'p1',
		});
		expect(task).toContain('p1');
	});

	it('dataset=generate: omits project id mention when absent', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'generate',
		});
		expect(task).toContain('Create a new DataTable');
		// Should fall back to 'current' language
		expect(task).toContain('current');
	});

	it('dataset=link-existing: uses provided id, forbids new creation', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'link-existing',
			existingDataTableId: 'dt-user-42',
		});
		expect(task).toContain('dt-user-42');
		expect(task).toContain('Do not create a new one');
		expect(task).not.toContain('5-7 realistic sample rows');
	});

	it('dataset=later: tells sub-agent to leave dataTableId empty', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'later',
		});
		expect(task).toContain('Do not create a DataTable');
		expect(task).toContain("Leave the EvaluationTrigger's dataTableId empty");
		expect(task).not.toContain('5-7 realistic sample rows');
	});

	it('lists each enabled metric with kind and canned key when present', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'later',
		});
		expect(task).toContain('Correctness');
		expect(task).toContain('llm-judge');
		expect(task).toContain('canned=correctness');
		expect(task).toContain('Judge prompt: Judge if the response is correct.');
	});

	it('omits canned marker when the metric has no cannedMetricKey', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'later',
			enabledMetrics: [
				{
					id: 'exact',
					name: 'Exact Match',
					kind: 'exact-match' as const,
					description: 'Literal string match.',
					defaultEnabled: true,
				},
			],
		});
		expect(task).toContain('Exact Match');
		expect(task).toContain('exact-match');
		expect(task).not.toContain('canned=');
	});

	it('mentions the checkIfEvaluating + IF topology as expected behavior', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'generate',
		});
		expect(task).toContain('checkIfEvaluating');
		expect(task).toContain('not evaluating');
	});

	it('lists the suggested output columns as bullet items', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'generate',
			suggestedOutputColumns: ['agent_response', 'tool_used'],
		});
		expect(task).toContain('- agent_response');
		expect(task).toContain('- tool_used');
	});
});
