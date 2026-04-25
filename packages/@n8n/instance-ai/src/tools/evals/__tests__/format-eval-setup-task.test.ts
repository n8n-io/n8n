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
			datasetChoice: 'later',
		});
		expect(task).toContain('w1');
		expect(task).toContain('Telegram AI Q&A Bot');
		expect(task).toContain('General Agent');
	});

	it('dataset=generate (legacy fallback): instructs sub-agent NOT to create a DataTable', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'generate',
		});
		expect(task).toContain('Do not create a DataTable');
		expect(task).toContain('upstream orchestrator');
	});

	it('dataset=link-existing: uses provided id, notes dataset is pre-populated', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'link-existing',
			existingDataTableId: 'dt-user-42',
		});
		expect(task).toContain('dt-user-42');
		expect(task).toContain('already created and populated');
		expect(task).not.toContain('Create a new DataTable');
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

	it('mentions the checkIfEvaluating topology as expected behavior', () => {
		const task = formatEvalSetupTask({
			...BASE,
			datasetChoice: 'generate',
		});
		expect(task).toContain('checkIfEvaluating');
		expect(task).toContain('setInputs');
		expect(task).toMatch(/Normal/);
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
