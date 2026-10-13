import { staticErrorWorkflowId } from '@/workflows/error-workflow-id';

describe('staticErrorWorkflowId', () => {
	it('returns the id for a concrete reference', () => {
		expect(staticErrorWorkflowId('wf-1')).toBe('wf-1');
	});

	it.each([undefined, '', 'DEFAULT', '={{ $json.handler }}'])(
		'returns undefined for %s, which names no concrete workflow',
		(value) => {
			expect(staticErrorWorkflowId(value)).toBeUndefined();
		},
	);
});
