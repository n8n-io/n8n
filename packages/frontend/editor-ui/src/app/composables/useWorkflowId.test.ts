import { VIEWS } from '@/app/constants';
import { useWorkflowId } from '@/app/composables/useWorkflowId';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const route = vi.hoisted(() => ({
	name: '' as string | symbol,
	params: {} as { workflowId?: string | string[] },
}));

vi.mock('vue-router', () => ({
	useRoute: () => route,
}));

describe('useWorkflowId', () => {
	beforeEach(() => {
		route.name = VIEWS.WORKFLOW;
		route.params = {};
	});

	it('uses the workflow route workflowId parameter', () => {
		route.params = { workflowId: 'workflow-123' };

		expect(useWorkflowId().value).toBe('workflow-123');
	});

	it('uses the first workflow route workflowId parameter when it is an array', () => {
		route.params = { workflowId: ['workflow-123', 'node-456'] };

		expect(useWorkflowId().value).toBe('workflow-123');
	});

	it('returns an empty string when the workflow route workflowId parameter is missing', () => {
		expect(useWorkflowId().value).toBe('');
	});

	it.each([VIEWS.DEMO, VIEWS.DEMO_DIFF])('uses demo for %s routes', (routeName) => {
		route.name = routeName;
		route.params = { workflowId: 'workflow-123' };

		expect(useWorkflowId().value).toBe('demo');
	});
});
