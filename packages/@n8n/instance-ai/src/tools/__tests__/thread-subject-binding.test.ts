import {
	INSTANCE_AI_APP_TARGETS_METADATA_KEY,
	INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY,
} from '@n8n/api-types';

import { PENDING_AGENT_METADATA_KEY } from '../orchestration/agent-target-binding';
import { withThreadSubject } from '../thread-subject-binding';

const APP_ID = '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f70';

describe('withThreadSubject', () => {
	it('binds an app subject', () => {
		expect(withThreadSubject({}, { type: 'app', id: APP_ID, projectId: 'project-1' })).toEqual({
			[INSTANCE_AI_APP_TARGETS_METADATA_KEY]: [{ appId: APP_ID, projectId: 'project-1' }],
		});
	});

	it('marks a pending agent subject', () => {
		expect(
			withThreadSubject(
				{},
				{ type: 'agent', id: 'agent-1', projectId: 'project-1', pending: true },
			),
		).toEqual({ [PENDING_AGENT_METADATA_KEY]: { projectId: 'project-1', agentId: 'agent-1' } });
	});

	it('keeps the agent of a thread when it binds an app', () => {
		const withAgent = withThreadSubject(
			{},
			{ type: 'agent', id: 'agent-1', projectId: 'project-1', pending: true },
		);

		const withBoth = withThreadSubject(withAgent ?? {}, {
			type: 'app',
			id: APP_ID,
			projectId: 'project-1',
			pending: true,
		});

		expect(withBoth).toEqual({
			[PENDING_AGENT_METADATA_KEY]: { projectId: 'project-1', agentId: 'agent-1' },
			[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: { appId: APP_ID, projectId: 'project-1' },
		});
	});
});
