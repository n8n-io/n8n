import { isWorkflowNotFoundError, WorkflowNotFoundError } from '../workflow-not-found.error';

describe('WorkflowNotFoundError', () => {
	// The eval harness classifies transient aborts by matching this text
	// (`isTransientExecutionAbort`), so the wording is a contract, not cosmetic.
	it('uses a stable message that includes the workflow id', () => {
		expect(new WorkflowNotFoundError('abc123').message).toBe(
			'Workflow abc123 not found or not accessible',
		);
	});

	it('is detected directly and when wrapped as a cause', () => {
		const root = new WorkflowNotFoundError('abc123');
		const wrapped = new Error('Failed to load existing workflow', { cause: root });

		expect(isWorkflowNotFoundError(root)).toBe(true);
		expect(isWorkflowNotFoundError(wrapped)).toBe(true);
	});

	it('does not match look-alike messages or non-errors', () => {
		expect(isWorkflowNotFoundError(new Error('Workflow abc123 not found or not accessible'))).toBe(
			false,
		);
		expect(isWorkflowNotFoundError('Workflow abc123 not found or not accessible')).toBe(false);
	});
});
