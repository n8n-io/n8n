import type { Request } from 'express';

import { getRoutePattern } from '@/utils/route-pattern';

// Only the fields the helper reads; the Express types ask for a full route.
const request = (fields: Record<string, unknown>) => fields as unknown as Request;

describe('getRoutePattern', () => {
	it('joins the mount path and the route pattern', () => {
		const req = request({
			baseUrl: '/rest/workflows',
			route: { path: '/:workflowId' },
			params: { workflowId: 'wf-1' },
			path: '/wf-1',
		});

		expect(getRoutePattern(req)).toBe('/rest/workflows/:workflowId');
	});

	it('puts the parameter name back into a mount path that Express matched with a value', () => {
		const req = request({
			baseUrl: '/rest/projects/proj-1/agents',
			route: { path: '/:agentId/chat' },
			params: { projectId: 'proj-1', agentId: 'agent-1' },
			path: '/agent-1/chat',
		});

		expect(getRoutePattern(req)).toBe('/rest/projects/:projectId/agents/:agentId/chat');
	});

	it('falls back to the request path with its parameters replaced when no route matched', () => {
		const req = request({ baseUrl: '', params: { id: '42' }, path: '/rest/things/42' });

		expect(getRoutePattern(req)).toBe('/rest/things/:id');
	});
});
