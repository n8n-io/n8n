import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { validateErrorWorkflowReference } from '../validate-error-workflow';

function makeContext(overrides: {
	get?: ReturnType<typeof vi.fn>;
	getAsWorkflowJSON?: ReturnType<typeof vi.fn>;
}): InstanceAiContext {
	return {
		workflowService: {
			get: overrides.get ?? vi.fn(),
			getAsWorkflowJSON: overrides.getAsWorkflowJSON ?? vi.fn(),
		},
		logger: { warn: vi.fn(), debug: vi.fn() },
	} as unknown as InstanceAiContext;
}

function workflowWithErrorWorkflow(errorWorkflow: unknown): WorkflowJSON {
	return {
		name: 'Main',
		nodes: [],
		connections: {},
		settings: { errorWorkflow } as WorkflowJSON['settings'],
	};
}

const publishedDetail = {
	id: 'err-1',
	name: 'Error Handler',
	activeVersionId: 'v-published',
};

describe('validateErrorWorkflowReference', () => {
	it('passes when settings.errorWorkflow is absent', async () => {
		const errors = await validateErrorWorkflowReference(
			{ name: 'Main', nodes: [], connections: {} },
			makeContext({}),
		);
		expect(errors).toEqual([]);
	});

	it.each([
		['the DEFAULT sentinel', 'DEFAULT'],
		['an empty string', ''],
	])('treats %s as no error workflow, without a lookup', async (_label, value) => {
		const get = vi.fn();
		const errors = await validateErrorWorkflowReference(
			workflowWithErrorWorkflow(value),
			makeContext({ get }),
		);

		expect(errors).toEqual([]);
		expect(get).not.toHaveBeenCalled();
	});

	it('rejects placeholder and expression values without a lookup', async () => {
		const get = vi.fn();
		const errors = await validateErrorWorkflowReference(
			workflowWithErrorWorkflow('<__PLACEHOLDER_VALUE__Error workflow__>'),
			makeContext({ get }),
		);

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('not a concrete workflow ID');
		expect(get).not.toHaveBeenCalled();
	});

	it('rejects ids that do not resolve to a workflow', async () => {
		const errors = await validateErrorWorkflowReference(
			workflowWithErrorWorkflow('local-sdk-id'),
			makeContext({ get: vi.fn().mockRejectedValue(new Error('not found')) }),
		);

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('could not be resolved');
	});

	it('rejects unpublished error workflows', async () => {
		const errors = await validateErrorWorkflowReference(
			workflowWithErrorWorkflow('err-1'),
			makeContext({
				get: vi.fn().mockResolvedValue({ ...publishedDetail, activeVersionId: null }),
			}),
		);

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('not published');
	});

	it('rejects published error workflows without an Error Trigger', async () => {
		const errors = await validateErrorWorkflowReference(
			workflowWithErrorWorkflow('err-1'),
			makeContext({
				get: vi.fn().mockResolvedValue(publishedDetail),
				getAsWorkflowJSON: vi.fn().mockResolvedValue({
					name: 'Error Handler',
					nodes: [{ id: '1', name: 'Send', type: 'n8n-nodes-base.slack', typeVersion: 2.3 }],
					connections: {},
				}),
			}),
		);

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('no Error Trigger');
	});

	it('passes for a published workflow with an Error Trigger', async () => {
		const getAsWorkflowJSON = vi.fn().mockResolvedValue({
			name: 'Error Handler',
			nodes: [{ id: '1', name: 'On Error', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1 }],
			connections: {},
		});
		const errors = await validateErrorWorkflowReference(
			workflowWithErrorWorkflow('err-1'),
			makeContext({ get: vi.fn().mockResolvedValue(publishedDetail), getAsWorkflowJSON }),
		);

		expect(errors).toEqual([]);
		expect(getAsWorkflowJSON).toHaveBeenCalledWith('err-1', 'v-published');
	});

	// The error-workflow launcher selects the Error Trigger without checking
	// `disabled` (WorkflowExecutionService.executeErrorWorkflow) and the engine
	// passes input data through disabled nodes, so a disabled Error Trigger still
	// fires the error workflow and must not fail the build.
	it('accepts a published error workflow whose Error Trigger is disabled', async () => {
		const errors = await validateErrorWorkflowReference(
			workflowWithErrorWorkflow('err-1'),
			makeContext({
				get: vi.fn().mockResolvedValue(publishedDetail),
				getAsWorkflowJSON: vi.fn().mockResolvedValue({
					name: 'Error Handler',
					nodes: [
						{
							id: '1',
							name: 'On Error',
							type: 'n8n-nodes-base.errorTrigger',
							typeVersion: 1,
							disabled: true,
						},
					],
					connections: {},
				}),
			}),
		);

		expect(errors).toEqual([]);
	});

	it('honors a configured custom error trigger type', async () => {
		const context = makeContext({
			get: vi.fn().mockResolvedValue(publishedDetail),
			getAsWorkflowJSON: vi.fn().mockResolvedValue({
				name: 'Error Handler',
				nodes: [{ id: '1', name: 'On Error', type: 'custom.errorTrigger', typeVersion: 1 }],
				connections: {},
			}),
		});
		(context as { errorTriggerType?: string }).errorTriggerType = 'custom.errorTrigger';

		const errors = await validateErrorWorkflowReference(
			workflowWithErrorWorkflow('err-1'),
			context,
		);

		expect(errors).toEqual([]);
	});

	it('fails closed when the published-version read fails', async () => {
		const errors = await validateErrorWorkflowReference(
			workflowWithErrorWorkflow('err-1'),
			makeContext({
				get: vi.fn().mockResolvedValue(publishedDetail),
				getAsWorkflowJSON: vi.fn().mockRejectedValue(new Error('read hiccup')),
			}),
		);

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('published version could not be read');
		expect(errors[0]).toContain('Retry the build');
		// Distinct from the workflow-not-found error.
		expect(errors[0]).not.toContain('could not be resolved');
	});
});
