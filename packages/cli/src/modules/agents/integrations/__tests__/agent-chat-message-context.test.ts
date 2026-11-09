import type { Message } from 'chat';
import { mock } from 'vitest-mock-extended';
import type { Logger } from 'n8n-workflow';

import { AgentChatMessageContextBridge } from '../agent-chat-message-context';

describe('AgentChatMessageContextBridge.resolveSubject', () => {
	const bridge = new AgentChatMessageContextBridge(
		undefined,
		{ type: 'linear', credentialId: 'cred-1' } as never,
		'agent-1',
		mock<Logger>(),
	);
	const subjectOf = (raw: unknown) =>
		({
			subject: Promise.resolve({ type: 'issue', id: 'ENG-1', title: 'Fix it', raw }),
		}) as unknown as Message<unknown>;

	it('keeps the project ID the platform reports on the subject', async () => {
		await expect(bridge.resolveSubject(subjectOf({ projectId: 'project-1' }))).resolves.toEqual({
			type: 'issue',
			id: 'ENG-1',
			title: 'Fix it',
			projectId: 'project-1',
		});
	});

	it('keeps the team ID the platform reports on the subject', async () => {
		await expect(bridge.resolveSubject(subjectOf({ teamId: 'team-1' }))).resolves.toEqual({
			type: 'issue',
			id: 'ENG-1',
			title: 'Fix it',
			teamId: 'team-1',
		});
	});

	it('leaves the project ID out when the platform reports none', async () => {
		await expect(bridge.resolveSubject(subjectOf({}))).resolves.toEqual({
			type: 'issue',
			id: 'ENG-1',
			title: 'Fix it',
		});
	});
});
