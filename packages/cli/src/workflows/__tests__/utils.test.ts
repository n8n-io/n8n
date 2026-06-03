import { WorkflowEntity } from '@n8n/db';

import { dropRedactionPolicy } from '@/workflows/utils';

describe('dropRedactionPolicy', () => {
	it('removes redactionPolicy when present', () => {
		const workflow = new WorkflowEntity();
		workflow.settings = { redactionPolicy: 'all', executionOrder: 'v1' };

		dropRedactionPolicy(workflow);

		expect(workflow.settings.redactionPolicy).toBeUndefined();
		expect(workflow.settings.executionOrder).toBe('v1');
	});

	it('is a no-op when settings has no redactionPolicy', () => {
		const workflow = new WorkflowEntity();
		workflow.settings = { executionOrder: 'v1' };

		dropRedactionPolicy(workflow);

		expect(workflow.settings).toEqual({ executionOrder: 'v1' });
	});

	it('is a no-op when settings is undefined', () => {
		const workflow = new WorkflowEntity();

		expect(() => dropRedactionPolicy(workflow)).not.toThrow();
		expect(workflow.settings).toBeUndefined();
	});
});
