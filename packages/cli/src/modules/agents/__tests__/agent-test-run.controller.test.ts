import type { AuthenticatedRequest, User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { AgentTestRunController } from '../agent-test-run.controller';
import type { SafeTestingFlagGate } from '../simulation/safe-testing-flag-gate';
import type { SimulationSessionService } from '../simulation/simulation-session.service';

describe('AgentTestRunController', () => {
	const user = mock<User>({ id: 'user-1' });
	const req = mock<AuthenticatedRequest<{ projectId: string }>>({ user });

	it('lists which tools can run in a test run', async () => {
		const sessions = mock<SimulationSessionService>();
		sessions.describeTools.mockResolvedValue([
			{ toolName: 'Send_Slack', kind: 'node', testability: 'simulated' },
		]);
		const controller = new AgentTestRunController(mock<SafeTestingFlagGate>(), sessions);

		await expect(
			controller.listTestRunTools(req, mock<Response>(), 'project-1', 'agent-1'),
		).resolves.toEqual({
			tools: [{ toolName: 'Send_Slack', kind: 'node', testability: 'simulated' }],
		});
		expect(sessions.describeTools).toHaveBeenCalledWith('agent-1', 'project-1');
	});

	it('returns 404 while the flag is off', async () => {
		const sessions = mock<SimulationSessionService>();
		const flagGate = mock<SafeTestingFlagGate>();
		flagGate.assertEnabled.mockRejectedValue(new NotFoundError('Not found'));
		const controller = new AgentTestRunController(flagGate, sessions);

		await expect(
			controller.listTestRunTools(req, mock<Response>(), 'project-1', 'agent-1'),
		).rejects.toThrow(NotFoundError);
		expect(sessions.describeTools).not.toHaveBeenCalled();
	});
});
