import { describe, expect, it } from 'vitest';
import { INSTANCE_AI_VIEW } from './constants';
import { instanceAiCreateAgentRoute } from './createAgentRoute';

describe('instanceAiCreateAgentRoute', () => {
	it('preserves the agent creation intent when entering Instance AI', () => {
		expect(instanceAiCreateAgentRoute('project-1')).toEqual({
			name: INSTANCE_AI_VIEW,
			query: {
				projectId: 'project-1',
				intent: 'agent',
			},
		});
	});
});
