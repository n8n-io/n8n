import { describe, expect, it } from 'vitest';
import { instanceAiCreateAgentRoute } from './createAgentRoute';

describe('instanceAiCreateAgentRoute', () => {
	it('routes agent creation directly to the new-agent view', () => {
		expect(instanceAiCreateAgentRoute('project-1')).toEqual({
			name: 'NewAgentView',
			query: { projectId: 'project-1' },
		});
	});
});
