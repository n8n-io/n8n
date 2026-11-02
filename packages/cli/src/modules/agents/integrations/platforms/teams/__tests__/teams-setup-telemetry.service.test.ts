import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { TeamsSetupTelemetryService, withTeamsFailure } from '../teams-setup-telemetry.service';

const report = {
	agentId: 'agent-1',
	projectId: 'project-1',
	userId: 'user-1',
	step: 'create_bot' as const,
};

describe('TeamsSetupTelemetryService', () => {
	let telemetry: ReturnType<typeof mock<Telemetry>>;
	let service: TeamsSetupTelemetryService;

	/** The properties the one event was tracked with. */
	const tracked = () => telemetry.track.mock.calls[0][1] as Record<string, unknown>;

	beforeEach(() => {
		telemetry = mock<Telemetry>();
		service = new TeamsSetupTelemetryService(telemetry);
	});

	it('records which rung of the bot ladder was taken', () => {
		service.succeeded({ ...report, botRoute: 'provisioned' });

		expect(tracked()).toMatchObject({
			agent_id: 'agent-1',
			step: 'create_bot',
			outcome: 'succeeded',
			bot_route: 'provisioned',
		});
	});

	/**
	 * The wall is named where it is hit, so rewording the sentence the user
	 * reads cannot quietly change what is counted.
	 */
	it('reports the wall the error was tagged with', () => {
		service.failed(
			report,
			withTeamsFailure(new UserError('any wording at all'), 'personal_account'),
		);

		expect(tracked()).toMatchObject({ outcome: 'failed', reason: 'personal_account' });
	});

	it('never reports the message itself, which can carry tenant detail', () => {
		service.failed(report, new Error('Tenant contoso.onmicrosoft.com refused user a@contoso.com'));

		const properties = tracked();
		expect(properties.reason).toBe('unknown');
		expect(JSON.stringify(properties)).not.toContain('contoso');
	});

	it('separates a wall the user can act on from an unexpected one', () => {
		service.failed(report, new UserError('Something the tenant forbids'));

		expect(tracked()).toMatchObject({ reason: 'refused' });
	});

	it('never lets reporting a step fail the step', () => {
		telemetry.track.mockImplementation(() => {
			throw new Error('telemetry is down');
		});

		expect(() => service.succeeded(report)).not.toThrow();
	});
});
