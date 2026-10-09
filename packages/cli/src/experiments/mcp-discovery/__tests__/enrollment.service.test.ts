import type { GlobalConfig } from '@n8n/config';
import type { ApiKey, ApiKeyRepository, Settings, SettingsRepository, User, Role } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { UserConsentRepository } from '@/modules/oauth-server/database/repositories/oauth-user-consent.repository';
import type { UserConsent } from '@/modules/oauth-server/database/entities/oauth-user-consent.entity';
import type { PostHogClient } from '@/posthog';

import { discoveryUserKey } from '../activity.service';
import { McpDiscoveryEnrollmentService } from '../enrollment.service';

vi.mock('@n8n/db', () => ({ SettingsRepository: class {}, ApiKeyRepository: class {} }));
vi.mock('@n8n/config', () => ({ GlobalConfig: class {} }));

vi.mock('@/posthog', () => ({ PostHogClient: class {} }));
vi.mock('@/modules/oauth-server/database/repositories/oauth-user-consent.repository', () => ({
	UserConsentRepository: class {},
}));

describe('MCP discovery enrollment', () => {
	const settings = mock<SettingsRepository>();
	const config = mock<GlobalConfig>({ deployment: { type: 'cloud' } });
	const posthog = mock<PostHogClient>();
	const consents = mock<UserConsentRepository>();
	const apiKeys = mock<ApiKeyRepository>();
	const rows = new Map<string, string>();
	let service: McpDiscoveryEnrollmentService;
	const start = Date.UTC(2026, 9, 2, 12);

	const owner = (id: string) => mock<User>({ id, role: mock<Role>({ slug: 'global:owner' }) });
	const visit = async (id: string) =>
		await service.visit(owner(id), { pickedClaude: true, isTrial: true });

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(start);
		rows.clear();
		for (const userId of ['owner', 'first', 'second', 'builder', 'other']) {
			rows.set(discoveryUserKey(userId, 'firstLoginAt'), String(start));
		}
		settings.claimKey.mockImplementation(async (key, value) => {
			if (rows.has(key) && rows.get(key) !== '') return false;
			rows.set(key, value);
			return true;
		});
		settings.findByKey.mockImplementation(async (key) => {
			const value = rows.get(key);
			return value === undefined ? null : mock<Settings>({ key, value });
		});
		posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({
			status: 'available',
			value: 'variant',
		});
		consents.findConnectedClients.mockResolvedValue({ rows: [], total: 0 });
		apiKeys.find.mockResolvedValue([]);
		service = new McpDiscoveryEnrollmentService(settings, config, posthog, consents, apiKeys);
	});

	afterEach(() => vi.useRealTimers());

	it.each(['global:admin', 'global:member'])(
		'does not enroll %s even with a Claude answer or saved assignment',
		async (slug) => {
			vi.setSystemTime(start + 30 * 60 * 1000);
			const saved = await visit('owner');
			const user = mock<User>({ id: 'owner', role: mock<Role>({ slug }) });
			posthog.getFeatureFlagForInstanceWithStatus.mockClear();

			expect((await service.visit(user, { pickedClaude: true, isTrial: true })).status).toBe(
				'inactive',
			);
			expect(posthog.getFeatureFlagForInstanceWithStatus).not.toHaveBeenCalled();
			expect(rows.get(discoveryUserKey('owner', 'assignment'))).toBe(
				JSON.stringify(saved.assignment),
			);
		},
	);

	it('starts the clock once and enrolls at the deadline', async () => {
		expect((await visit('owner')).status).toBe('waiting');
		vi.setSystemTime(start + 30 * 60 * 1000);
		expect(await visit('owner')).toMatchObject({
			status: 'assigned',
			assignment: { variant: 'variant' },
		});
		expect(rows.get(discoveryUserKey('owner', 'firstLoginAt'))).toBe(String(start));
	});

	it('keeps the saved assignment after AI use', async () => {
		await visit('owner');
		vi.setSystemTime(start + 30 * 60 * 1000);
		const assigned = await visit('owner');
		rows.set(discoveryUserKey('owner', 'assistantMutationAt'), String(Date.now()));
		expect(await visit('owner')).toEqual(assigned);
	});

	it('keeps an existing assignment after upgrade', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		const assigned = await visit('owner');
		expect(await service.visit(owner('owner'), { pickedClaude: true, isTrial: false })).toEqual(
			assigned,
		);
		expect(await service.visit(owner('owner'))).toEqual(assigned);
	});

	it('does not assign a user who upgraded before returning', async () => {
		await visit('owner');
		vi.setSystemTime(start + 60 * 60 * 1000);
		expect(
			await service.visit(owner('owner'), { pickedClaude: true, isTrial: false }),
		).toMatchObject({ status: 'excluded' });
	});

	it('uses the winning instance assignment for a later eligible owner', async () => {
		await visit('first');
		await visit('second');
		vi.setSystemTime(start + 30 * 60 * 1000);
		await visit('first');
		posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({
			status: 'available',
			value: 'control',
		});
		expect(await visit('second')).toMatchObject({ assignment: { variant: 'variant' } });
	});

	it('completes an empty user claim with the saved instance assignment', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		const first = await visit('first');
		const instanceAssignment = rows.get('experiment.mcpDiscovery.instanceAssignment');
		rows.set(discoveryUserKey('second', 'assignment'), '');
		posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({
			status: 'available',
			value: 'control',
		});

		expect(await visit('second')).toMatchObject({
			status: 'assigned',
			assignment: first.assignment,
		});
		expect(rows.get(discoveryUserKey('second', 'assignment'))).toBe(instanceAssignment);
		expect(rows.get('experiment.mcpDiscovery.instanceAssignment')).toBe(instanceAssignment);
	});

	it('recovers empty instance and user claims with one shared assignment', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		rows.set('experiment.mcpDiscovery.instanceAssignment', '');
		rows.set(discoveryUserKey('first', 'assignment'), '');
		rows.set(discoveryUserKey('second', 'assignment'), '');
		posthog.getFeatureFlagForInstanceWithStatus
			.mockResolvedValueOnce({ status: 'available', value: 'variant' })
			.mockResolvedValueOnce({ status: 'available', value: 'control' });

		const [first, second] = await Promise.all([visit('first'), visit('second')]);

		expect(first.status).toBe('assigned');
		expect(second.status).toBe('assigned');
		expect(first.assignment).toEqual(second.assignment);
		const instanceAssignment = rows.get('experiment.mcpDiscovery.instanceAssignment');
		expect(rows.get(discoveryUserKey('first', 'assignment'))).toBe(instanceAssignment);
		expect(rows.get(discoveryUserKey('second', 'assignment'))).toBe(instanceAssignment);
	});

	it('checks eligibility before completing an empty user claim', async () => {
		const key = discoveryUserKey('owner', 'assignment');
		rows.set(key, '');

		expect((await visit('owner')).status).toBe('waiting');
		expect(rows.get(key)).toBe('');
		expect(settings.claimKey).not.toHaveBeenCalled();
	});

	it('does not overwrite a malformed nonempty assignment', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		const key = discoveryUserKey('owner', 'assignment');
		rows.set(key, 'invalid');

		expect((await visit('owner')).status).toBe('unknown');
		expect(rows.get(key)).toBe('invalid');
		expect(settings.claimKey).not.toHaveBeenCalled();
	});

	it('checks a new owner against their own Assistant history', async () => {
		await visit('builder');
		await visit('other');
		rows.set(discoveryUserKey('builder', 'assistantMutationAt'), String(start));
		vi.setSystemTime(start + 30 * 60 * 1000);
		expect((await visit('builder')).status).toBe('excluded');
		expect((await visit('other')).status).toBe('assigned');
	});

	it('keeps first-login clocks separate when ownership changes', async () => {
		rows.set(discoveryUserKey('second', 'firstLoginAt'), String(start + 20 * 60 * 1000));
		vi.setSystemTime(start + 30 * 60 * 1000);
		expect((await visit('first')).status).toBe('assigned');
		expect((await visit('second')).status).toBe('waiting');
		vi.setSystemTime(start + 50 * 60 * 1000);
		expect((await visit('second')).status).toBe('assigned');
	});

	it('excludes an owner whose onboarding answer does not include Claude', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		expect(
			(await service.visit(owner('owner'), { pickedClaude: false, isTrial: true })).status,
		).toBe('excluded');
	});

	it('enrolls a user who already connected an MCP client', async () => {
		consents.findConnectedClients.mockResolvedValue({ rows: [], total: 1 });
		vi.setSystemTime(start + 30 * 60 * 1000);
		expect((await visit('owner')).status).toBe('assigned');
	});

	it('reports a new connection without changing the saved assignment', async () => {
		await visit('owner');
		vi.setSystemTime(start + 30 * 60 * 1000);
		const assigned = await visit('owner');
		consents.findConnectedClients.mockResolvedValue({ rows: [], total: 1 });
		expect(await visit('owner')).toEqual({
			...assigned,
		});
	});

	it('uses the fixed cutoff when the first evaluation happens on return', async () => {
		rows.set(discoveryUserKey('owner', 'assistantMutationAt'), String(start + 45 * 60 * 1000));
		vi.setSystemTime(start + 60 * 60 * 1000);
		expect(await visit('owner')).toMatchObject({
			status: 'assigned',
			eligibleAt: start + 30 * 60 * 1000,
		});
	});

	it('does not start a login clock from an editor visit', async () => {
		expect((await visit('no-login')).status).toBe('unknown');
		expect(rows.has(discoveryUserKey('no-login', 'firstLoginAt'))).toBe(false);
	});

	it('preserves enrollment after successful Claude use', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		const before = await visit('owner');
		rows.set(discoveryUserKey('owner', 'claudeMcpUsedAt'), String(Date.now()));
		expect(await visit('owner')).toMatchObject({
			status: 'assigned',
			assignment: before.assignment,
			hasUsedClaudeMcp: true,
		});
	});

	it('returns to Connect after OAuth access is revoked', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		rows.set(discoveryUserKey('owner', 'claudeClient.claude-id'), '1000');
		consents.findConnectedClients.mockResolvedValue({
			rows: [mock<UserConsent>({ clientId: 'claude-id', client: { name: 'Custom client name' } })],
			total: 1,
		});
		expect((await visit('owner')).hasConnectedClaude).toBe(true);
		consents.findConnectedClients.mockResolvedValue({ rows: [], total: 0 });
		expect((await visit('owner')).hasConnectedClaude).toBe(false);
	});

	it('requires a new Claude connection after an API key rotation', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		rows.set(discoveryUserKey('owner', 'claudeApiKey.old-key'), '1000');
		apiKeys.find.mockResolvedValue([mock<ApiKey>({ id: 'old-key' })]);
		expect((await visit('owner')).hasConnectedClaude).toBe(true);
		apiKeys.find.mockResolvedValue([mock<ApiKey>({ id: 'new-key' })]);
		expect((await visit('owner')).hasConnectedClaude).toBe(false);
	});

	it('recognizes an existing Claude consent without waiting for a new request', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		consents.findConnectedClients.mockResolvedValue({
			rows: [mock<UserConsent>({ clientId: 'claude-id', client: { name: 'Claude' } })],
			total: 1,
		});
		expect((await visit('owner')).hasConnectedClaude).toBe(true);
	});

	it('leaves a missing onboarding answer unknown', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		expect((await service.visit(owner('owner'), { isTrial: true })).status).toBe('unknown');
	});

	it('keeps dismissal in shared storage across service instances', async () => {
		await service.dismissCoachmark('owner');
		const another = new McpDiscoveryEnrollmentService(settings, config, posthog, consents, apiKeys);
		expect(
			(await another.visit(owner('owner'), { pickedClaude: true, isTrial: true }))
				.coachmarkDismissed,
		).toBe(true);
		expect(
			(await another.visit(owner('other'), { pickedClaude: true, isTrial: true }))
				.coachmarkDismissed,
		).toBe(false);
	});

	it('does not assign an instance outside the PostHog cohort', async () => {
		posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({
			status: 'available',
			value: false,
		});
		expect((await visit('owner')).status).toBe('inactive');
		expect(rows.has(discoveryUserKey('owner', 'assignment'))).toBe(false);
	});

	it('returns unknown while PostHog is unavailable and enrolls after recovery', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({ status: 'unavailable' });

		expect((await visit('owner')).status).toBe('unknown');
		expect(settings.claimKey).not.toHaveBeenCalled();

		vi.setSystemTime(start + 31 * 60 * 1000);
		posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({
			status: 'available',
			value: 'variant',
		});
		expect(await visit('owner')).toMatchObject({
			status: 'assigned',
			eligibleAt: start + 30 * 60 * 1000,
			assignment: { variant: 'variant' },
		});
	});

	it.each(['control', 'variant'] as const)(
		'preserves a saved %s assignment through a PostHog outage',
		async (variant) => {
			vi.setSystemTime(start + 30 * 60 * 1000);
			posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({
				status: 'available',
				value: variant,
			});
			await service.dismissCoachmark('owner');
			const assigned = await visit('owner');
			const savedRows = new Map(rows);
			settings.claimKey.mockClear();
			posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({ status: 'unavailable' });

			expect(await visit('owner')).toEqual({
				status: 'unknown',
				coachmarkDismissed: true,
			});
			expect(rows).toEqual(savedRows);
			expect(settings.claimKey).not.toHaveBeenCalled();

			vi.setSystemTime(start + 31 * 60 * 1000);
			posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({
				status: 'available',
				value: variant === 'control' ? 'variant' : 'control',
			});
			expect(await visit('owner')).toEqual(assigned);
			expect(rows).toEqual(savedRows);
		},
	);

	it('excludes an account that is not trialing', async () => {
		expect(
			(await service.visit(owner('owner'), { pickedClaude: true, isTrial: false })).status,
		).toBe('excluded');
		expect(posthog.getFeatureFlagForInstanceWithStatus).not.toHaveBeenCalled();
	});

	it('retries missing trial data and assigns when Cloud confirms a trial', async () => {
		vi.setSystemTime(start + 31 * 60 * 1000);
		expect(await service.visit(owner('owner'), { pickedClaude: true })).toMatchObject({
			status: 'unknown',
		});
		expect(settings.claimKey).not.toHaveBeenCalled();
		expect((await visit('owner')).status).toBe('assigned');
	});

	it('honors the kill switch without erasing assignments', async () => {
		await visit('owner');
		vi.setSystemTime(start + 30 * 60 * 1000);
		await visit('owner');
		posthog.getFeatureFlagForInstanceWithStatus.mockResolvedValue({
			status: 'available',
			value: false,
		});
		expect((await visit('owner')).status).toBe('inactive');
		expect(rows.has(discoveryUserKey('owner', 'assignment'))).toBe(true);
	});
	it('waits for an unfinished Assistant write instead of excluding or enrolling', async () => {
		vi.setSystemTime(start + 31 * 60 * 1000);
		rows.set(discoveryUserKey('owner', 'assistantMutationAt'), '');
		expect((await visit('owner')).status).toBe('unknown');
		expect(rows.has(discoveryUserKey('owner', 'assignment'))).toBe(false);
		rows.set(discoveryUserKey('owner', 'assistantMutationAt'), String(start + 20 * 60 * 1000));
		expect((await visit('owner')).status).toBe('excluded');
	});

	it('does not hide entry points for an unfinished Claude write', async () => {
		vi.setSystemTime(start + 31 * 60 * 1000);
		rows.set(discoveryUserKey('owner', 'claudeMcpUsedAt'), '');
		expect(await visit('owner')).toMatchObject({ status: 'assigned', hasUsedClaudeMcp: false });
		rows.set(discoveryUserKey('owner', 'claudeMcpUsedAt'), String(Date.now()));
		expect(await visit('owner')).toMatchObject({ status: 'assigned', hasUsedClaudeMcp: true });
	});

	it('does not count an unfinished credential observation as a connection', async () => {
		vi.setSystemTime(start + 31 * 60 * 1000);
		apiKeys.find.mockResolvedValue([mock<ApiKey>({ id: 'key' })]);
		rows.set(discoveryUserKey('owner', 'claudeApiKey.key'), '');
		expect(await visit('owner')).toMatchObject({ hasConnectedClaude: false });
	});
});
