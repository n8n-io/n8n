// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import type { GlobalConfig } from '@n8n/config';
import type { ApiKey, ApiKeyRepository, Settings, SettingsRepository, User, Role } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { UserConsentRepository } from '@/modules/oauth-server/database/repositories/oauth-user-consent.repository';
import type { UserConsent } from '@/modules/oauth-server/database/entities/oauth-user-consent.entity';

import type { McpDiscoveryActivityEvents } from '../activity-events.service';
import { discoveryUserKey } from '../activity.service';
import { McpDiscoveryEnrollmentService } from '../enrollment.service';

vi.mock('@n8n/db', () => ({ SettingsRepository: class {}, ApiKeyRepository: class {} }));
vi.mock('@n8n/config', () => ({ GlobalConfig: class {} }));

vi.mock('@/modules/oauth-server/database/repositories/oauth-user-consent.repository', () => ({
	UserConsentRepository: class {},
}));

describe('MCP discovery enrollment', () => {
	const settings = mock<SettingsRepository>();
	const config = mock<GlobalConfig>({ deployment: { type: 'cloud' } });
	const consents = mock<UserConsentRepository>();
	const apiKeys = mock<ApiKeyRepository>();
	const activityEvents = mock<McpDiscoveryActivityEvents>();
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
		consents.findConnectedClients.mockResolvedValue({ rows: [], total: 0 });
		apiKeys.find.mockResolvedValue([]);
		service = new McpDiscoveryEnrollmentService(
			settings,
			config,
			consents,
			apiKeys,
			activityEvents,
		);
	});

	afterEach(() => vi.useRealTimers());

	it.each(['global:admin', 'global:member'])(
		'does not enroll %s even with a Claude answer or saved eligibility',
		async (slug) => {
			vi.setSystemTime(start + 30 * 60 * 1000);
			const saved = await visit('owner');
			const user = mock<User>({ id: 'owner', role: mock<Role>({ slug }) });

			expect((await service.visit(user, { pickedClaude: true, isTrial: true })).status).toBe(
				'inactive',
			);
			expect(rows.get(discoveryUserKey('owner', 'eligibleAt'))).toBe(String(saved.eligibleAt));
		},
	);

	it('waits for observed Assistant activity before it reads eligibility', async () => {
		activityEvents.flush.mockImplementationOnce(async () => {
			rows.set(discoveryUserKey('owner', 'assistantMutationAt'), String(start + 1000));
		});
		vi.setSystemTime(start + 30 * 60 * 1000);
		expect((await visit('owner')).status).toBe('excluded');
		expect(activityEvents.flush).toHaveBeenCalledOnce();
	});

	it('starts the clock once and enrolls at the deadline', async () => {
		expect((await visit('owner')).status).toBe('waiting');
		vi.setSystemTime(start + 30 * 60 * 1000);
		expect(await visit('owner')).toMatchObject({
			status: 'assigned',
			eligibleAt: start + 30 * 60 * 1000,
		});
		expect(rows.get(discoveryUserKey('owner', 'firstLoginAt'))).toBe(String(start));
	});

	it('keeps the saved eligibility after AI use', async () => {
		await visit('owner');
		vi.setSystemTime(start + 30 * 60 * 1000);
		const assigned = await visit('owner');
		rows.set(discoveryUserKey('owner', 'assistantMutationAt'), String(Date.now()));
		expect(await visit('owner')).toEqual(assigned);
	});

	it('keeps an existing eligibility after upgrade', async () => {
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

	it('recovers an empty eligibility claim after checking eligibility', async () => {
		const key = discoveryUserKey('owner', 'eligibleAt');
		rows.set(key, '');
		expect((await visit('owner')).status).toBe('waiting');
		expect(rows.get(key)).toBe('');
		vi.setSystemTime(start + 30 * 60 * 1000);
		expect((await visit('owner')).status).toBe('assigned');
		expect(rows.get(key)).toBe(String(Date.now()));
	});

	it('stores eligibility without an instance or user variant assignment', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		const result = await visit('owner');
		expect(result).not.toHaveProperty('assignment');
		expect(rows.has(discoveryUserKey('owner', 'assignment'))).toBe(false);
		expect(rows.has('experiment.mcpDiscovery.instanceAssignment')).toBe(false);
		expect(settings.claimKey).toHaveBeenCalledExactlyOnceWith(
			discoveryUserKey('owner', 'eligibleAt'),
			String(Date.now()),
		);
	});

	it('restores eligibility saved by the previous implementation without reading its variant', async () => {
		rows.set(discoveryUserKey('owner', 'eligibleAt'), String(start));
		rows.set(
			discoveryUserKey('owner', 'assignment'),
			JSON.stringify({ variant: 'control', assignedAt: start }),
		);
		const result = await service.visit(owner('owner'));
		expect(result).toMatchObject({ status: 'assigned', eligibleAt: start });
		expect(result).not.toHaveProperty('assignment');
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

	it('reports a new connection without changing the saved eligibility', async () => {
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

	it('preserves enrollment after successful MCP use', async () => {
		vi.setSystemTime(start + 30 * 60 * 1000);
		const before = await visit('owner');
		rows.set(discoveryUserKey('owner', 'claudeMcpUsedAt'), String(Date.now()));
		expect(await visit('owner')).toMatchObject({
			status: 'assigned',
			eligibleAt: before.eligibleAt,
			hasUsedMcp: true,
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

	it('excludes an account that is not trialing', async () => {
		expect(
			(await service.visit(owner('owner'), { pickedClaude: true, isTrial: false })).status,
		).toBe('excluded');
	});

	it('retries missing trial data and assigns when Cloud confirms a trial', async () => {
		vi.setSystemTime(start + 31 * 60 * 1000);
		expect(await service.visit(owner('owner'), { pickedClaude: true })).toMatchObject({
			status: 'unknown',
		});
		expect(settings.claimKey).not.toHaveBeenCalled();
		expect((await visit('owner')).status).toBe('assigned');
	});

	it('waits for an unfinished Assistant write instead of excluding or enrolling', async () => {
		vi.setSystemTime(start + 31 * 60 * 1000);
		rows.set(discoveryUserKey('owner', 'assistantMutationAt'), '');
		expect((await visit('owner')).status).toBe('unknown');
		expect(rows.has(discoveryUserKey('owner', 'eligibleAt'))).toBe(false);
		rows.set(discoveryUserKey('owner', 'assistantMutationAt'), String(start + 20 * 60 * 1000));
		expect((await visit('owner')).status).toBe('excluded');
	});

	it('does not hide entry points for an unfinished MCP write', async () => {
		vi.setSystemTime(start + 31 * 60 * 1000);
		rows.set(discoveryUserKey('owner', 'claudeMcpUsedAt'), '');
		expect(await visit('owner')).toMatchObject({ status: 'assigned', hasUsedMcp: false });
		rows.set(discoveryUserKey('owner', 'claudeMcpUsedAt'), String(Date.now()));
		expect(await visit('owner')).toMatchObject({ status: 'assigned', hasUsedMcp: true });
	});

	it('does not count an unfinished credential observation as a connection', async () => {
		vi.setSystemTime(start + 31 * 60 * 1000);
		apiKeys.find.mockResolvedValue([mock<ApiKey>({ id: 'key' })]);
		rows.set(discoveryUserKey('owner', 'claudeApiKey.key'), '');
		expect(await visit('owner')).toMatchObject({ hasConnectedClaude: false });
	});
});
// EOF Experiment cleanup
