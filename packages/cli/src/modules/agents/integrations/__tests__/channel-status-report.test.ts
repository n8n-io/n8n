import type { AgentIntegrationConfig } from '@n8n/api-types';

import type { AgentChannelStatus } from '../../entities/agent-channel-status.entity';
import { buildChannelStatusReport } from '../channel-status-report';

const PUBLISHED = 'version-1';

const slack: AgentIntegrationConfig = { type: 'slack', credentialId: 'cred-slack' };
const telegram: AgentIntegrationConfig = {
	type: 'telegram',
	credentialId: 'cred-telegram',
	settings: { accessMode: 'public', allowedUsers: [] },
};

/** Live unless a test says otherwise — expiry is exercised on its own below. */
const isLive = (row: AgentChannelStatus) =>
	row.expiresAt === null || row.expiresAt.getTime() > Date.now();

function row(
	integration: AgentIntegrationConfig,
	hostId: string,
	overrides: Partial<AgentChannelStatus> = {},
): AgentChannelStatus {
	return {
		agentId: 'agent-1',
		integrationType: integration.type,
		credentialId: integration.credentialId,
		hostId,
		status: 'connected',
		errorMessage: null,
		attempts: 0,
		backoffUntil: null,
		expiresAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as AgentChannelStatus;
}

function erroredRow(
	integration: AgentIntegrationConfig,
	hostId: string,
	message: string,
	overrides: Partial<AgentChannelStatus> = {},
): AgentChannelStatus {
	return row(integration, hostId, {
		status: 'error',
		errorMessage: message,
		attempts: 2,
		...overrides,
	});
}

describe('buildChannelStatusReport', () => {
	it('reports no channels as disconnected', () => {
		expect(buildChannelStatusReport([], PUBLISHED, [], isLive)).toEqual({
			status: 'disconnected',
			integrations: [],
		});
	});

	it('reports every channel of an unpublished agent as configured, whatever the rows say', () => {
		// A row can outlive an unpublish that failed to clear it; the agent still
		// must not be reported as receiving events.
		const report = buildChannelStatusReport(
			[slack],
			null,
			[erroredRow(slack, 'main-a', 'boom')],
			isLive,
		);

		expect(report.status).toBe('configured');
		expect(report.integrations).toEqual([
			{ type: 'slack', credentialId: 'cred-slack', status: 'configured' },
		]);
	});

	it('reports a channel with no recorded attempt as starting, not connected', () => {
		const report = buildChannelStatusReport([slack], PUBLISHED, [], isLive);

		expect(report.integrations[0].status).toBe('starting');
		expect(report.status).toBe('partial');
	});

	it('reports a failed startup as an error carrying the reason', () => {
		const report = buildChannelStatusReport(
			[slack],
			PUBLISHED,
			[erroredRow(slack, 'main-a', 'Credential cred-slack not found')],
			isLive,
		);

		expect(report.integrations[0]).toEqual({
			type: 'slack',
			credentialId: 'cred-slack',
			status: 'error',
			errorMessage: 'Credential cred-slack not found',
		});
		expect(report.status).toBe('error');
	});

	it('reports connected only when the channel actually started', () => {
		const report = buildChannelStatusReport([slack], PUBLISHED, [row(slack, 'main-a')], isLive);

		expect(report.integrations[0].status).toBe('connected');
		expect(report.status).toBe('connected');
	});

	it('carries settings through', () => {
		const report = buildChannelStatusReport(
			[telegram],
			PUBLISHED,
			[row(telegram, 'main-a')],
			isLive,
		);

		expect(report.integrations[0]).toMatchObject({
			type: 'telegram',
			settings: { accessMode: 'public', allowedUsers: [] },
		});
	});

	it('leaves draft entries out — they are not a channel yet', () => {
		const draft: AgentIntegrationConfig = { type: 'discord', credentialId: '' };

		const report = buildChannelStatusReport(
			[slack, draft],
			PUBLISHED,
			[row(slack, 'main-a')],
			isLive,
		);

		expect(report.integrations).toHaveLength(1);
		expect(report.status).toBe('connected');
	});

	describe('combining what several instances observed', () => {
		it('reports connected when every instance running it agrees', () => {
			const report = buildChannelStatusReport(
				[slack],
				PUBLISHED,
				[row(slack, 'main-a'), row(slack, 'main-b'), row(slack, 'main-c')],
				isLive,
			);

			expect(report.integrations[0].status).toBe('connected');
		});

		it('reports an error when any instance cannot run it, because it cannot serve it either', () => {
			const report = buildChannelStatusReport(
				[slack],
				PUBLISHED,
				[
					row(slack, 'main-a'),
					erroredRow(slack, 'main-b', 'connect ECONNREFUSED'),
					row(slack, 'main-c'),
				],
				isLive,
			);

			expect(report.integrations[0]).toMatchObject({
				status: 'error',
				errorMessage: 'connect ECONNREFUSED',
			});
		});

		it('gives the same answer whatever order the rows arrive in', () => {
			// The single shared row this replaced reported whichever main wrote last,
			// so the same cluster state could read differently on each request.
			const rows = [
				row(slack, 'main-a'),
				erroredRow(slack, 'main-b', 'boom'),
				row(slack, 'main-c'),
			];

			const forward = buildChannelStatusReport([slack], PUBLISHED, rows, isLive);
			const reversed = buildChannelStatusReport([slack], PUBLISHED, [...rows].reverse(), isLive);

			expect(reversed).toEqual(forward);
		});

		it('quotes the most recent failure when several instances are failing', () => {
			const older = erroredRow(slack, 'main-a', 'first cause', {
				updatedAt: new Date('2026-01-01T00:00:00.000Z'),
			});
			const newer = erroredRow(slack, 'main-b', 'current cause', {
				updatedAt: new Date('2026-01-01T00:05:00.000Z'),
			});

			const report = buildChannelStatusReport([slack], PUBLISHED, [older, newer], isLive);

			expect(report.integrations[0].errorMessage).toBe('current cause');
		});

		it('picks the same failure when two instances failed in the same instant', () => {
			// Equal timestamps would otherwise leave the answer to row order, and the
			// message could change between two identical requests.
			const at = new Date('2026-01-01T00:00:00.000Z');
			const rows = [
				erroredRow(slack, 'main-b', 'from b', { updatedAt: at }),
				erroredRow(slack, 'main-a', 'from a', { updatedAt: at }),
			];

			const forward = buildChannelStatusReport([slack], PUBLISHED, rows, isLive);
			const reversed = buildChannelStatusReport([slack], PUBLISHED, [...rows].reverse(), isLive);

			expect(forward.integrations[0].errorMessage).toBe('from a');
			expect(reversed).toEqual(forward);
		});

		it('keeps one instance’s failure from bleeding onto another channel', () => {
			const report = buildChannelStatusReport(
				[slack, telegram],
				PUBLISHED,
				[erroredRow(slack, 'main-a', 'boom'), row(telegram, 'main-a')],
				isLive,
			);

			expect(report.integrations.map((entry) => entry.status)).toEqual(['error', 'connected']);
		});
	});

	describe('rows whose owner is gone', () => {
		const expired = { expiresAt: new Date(Date.now() - 60_000) };

		it('ignores an expired failure rather than pinning the channel to it', () => {
			const report = buildChannelStatusReport(
				[slack],
				PUBLISHED,
				[row(slack, 'main-a'), erroredRow(slack, 'main-dead', 'boom', expired)],
				isLive,
			);

			expect(report.integrations[0].status).toBe('connected');
		});

		it('falls back to starting when every row has expired', () => {
			const report = buildChannelStatusReport(
				[slack],
				PUBLISHED,
				[row(slack, 'main-dead', expired)],
				isLive,
			);

			expect(report.integrations[0].status).toBe('starting');
		});

		it('trusts a row with no expiry, which means nothing is refreshing it by design', () => {
			const report = buildChannelStatusReport(
				[slack],
				PUBLISHED,
				[row(slack, 'main-a', { expiresAt: null })],
				isLive,
			);

			expect(report.integrations[0].status).toBe('connected');
		});
	});

	describe('rollup', () => {
		it('is partial when one channel runs and another does not', () => {
			const report = buildChannelStatusReport(
				[slack, telegram],
				PUBLISHED,
				[row(slack, 'main-a'), erroredRow(telegram, 'main-a', 'boom')],
				isLive,
			);

			expect(report.status).toBe('partial');
			expect(report.integrations.map((entry) => entry.status)).toEqual(['connected', 'error']);
		});

		it('is error only when nothing is running', () => {
			const report = buildChannelStatusReport(
				[slack, telegram],
				PUBLISHED,
				[erroredRow(slack, 'main-a', 'boom'), erroredRow(telegram, 'main-a', 'boom')],
				isLive,
			);

			expect(report.status).toBe('error');
		});

		it('does not claim an error while channels are still starting', () => {
			const report = buildChannelStatusReport([slack, telegram], PUBLISHED, [], isLive);

			expect(report.status).toBe('partial');
		});
	});
});
