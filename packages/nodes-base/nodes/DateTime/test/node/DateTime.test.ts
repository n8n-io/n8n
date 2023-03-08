import { testWorkflows, getWorkflowFilenames } from '../../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

// ! When making changes to the Workflow test files make sure to export env TZ=UTC as Github Actions runs in UTC timezone
if (new Date().getTimezoneOffset() === 0) {
	describe('Test DateTime Node', () => testWorkflows(workflows));
} else {
	describe('Test DateTime Node', () => {
		it('Skipped because timezone is not UTC', () => {
			expect(true).toBe(true);
		});
	});
}
