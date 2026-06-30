import type { Logger } from '@n8n/backend-common';
import type { SsrfProtectionService } from '@n8n/backend-network';
import type { InstanceSettingsLoaderConfig, SsrfProtectionConfig } from '@n8n/config';
import { SSRF_DEFAULT_BLOCKED_IP_RANGES } from '@n8n/config';
import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { EGRESS_POLICY_KEY, EgressPolicyService } from '../egress-policy.service';

const FLOOR = [...SSRF_DEFAULT_BLOCKED_IP_RANGES];
const union = (a: string[], b: string[]): string[] => [...new Set([...a, ...b])];

describe('EgressPolicyService', () => {
	// `default` env expansion: the seed blocked list is exactly the built-in floor.
	const envConfig = {
		mode: 'log' as const,
		editable: true,
		blockedIpRanges: [...FLOOR],
		allowedIpRanges: [] as string[],
		allowedHostnames: [] as string[],
		blockedHostnames: [] as string[],
	};

	let ssrfProtectionService: ReturnType<typeof mock<SsrfProtectionService>>;
	let findByKey: jest.Mock<Promise<Settings | null>, [string]>;
	let upsert: jest.Mock;
	let settingsRepository: SettingsRepository;
	let publisher: ReturnType<typeof mock<Publisher>>;
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });

	const createService = (
		configOverrides: Partial<SsrfProtectionConfig> = {},
		loaderOverrides: Partial<InstanceSettingsLoaderConfig> = {},
	) => {
		const ssrfConfig = { ...envConfig, ...configOverrides } as unknown as SsrfProtectionConfig;
		const loaderConfig = {
			egressProtectionManagedByEnv: false,
			...loaderOverrides,
		} as unknown as InstanceSettingsLoaderConfig;
		return new EgressPolicyService(
			ssrfConfig,
			loaderConfig,
			ssrfProtectionService,
			settingsRepository,
			publisher,
			logger,
		);
	};

	const storedPolicy = (value: Record<string, unknown>): Settings => ({
		key: EGRESS_POLICY_KEY,
		value: JSON.stringify(value),
		loadOnStartup: true,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		ssrfProtectionService = mock<SsrfProtectionService>();
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue(undefined);
		findByKey = jest.fn<Promise<Settings | null>, [string]>().mockResolvedValue(null);
		upsert = jest.fn();
		settingsRepository = { findByKey, upsert } as unknown as SettingsRepository;
	});

	describe('reload / applyEffective', () => {
		it('applies the env seed (with the built-in floor) when no policy row exists', async () => {
			const service = createService();
			await service.reload();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith({
				mode: 'log',
				blockedIpRanges: FLOOR,
				allowedIpRanges: [],
				allowedHostnames: [],
				blockedHostnames: [],
			});
		});

		it('applies the stored policy, layering the built-in floor on the blocked IP ranges', async () => {
			findByKey.mockResolvedValue(
				storedPolicy({
					mode: 'enforce',
					blockedIpRanges: ['100.64.0.0/10'],
					allowedIpRanges: ['10.5.0.0/24'],
					allowedHostnames: ['api.internal'],
					blockedHostnames: ['*.tracker.example'],
				}),
			);

			const service = createService();
			await service.reload();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith({
				mode: 'enforce',
				blockedIpRanges: union(FLOOR, ['100.64.0.0/10']),
				allowedIpRanges: ['10.5.0.0/24'],
				allowedHostnames: ['api.internal'],
				blockedHostnames: ['*.tracker.example'],
			});
		});

		it('keeps the built-in floor even when the stored policy tries to drop it', async () => {
			// A stored policy that lists a floor entry (or none) can never remove the floor.
			findByKey.mockResolvedValue(
				storedPolicy({ mode: 'enforce', blockedIpRanges: ['10.0.0.0/8'] }),
			);

			const service = createService();
			await service.reload();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith(
				expect.objectContaining({ mode: 'enforce', blockedIpRanges: FLOOR }),
			);
		});

		it('falls back to the env seed when the stored policy is corrupt', async () => {
			findByKey.mockResolvedValue({
				key: EGRESS_POLICY_KEY,
				value: 'not json',
				loadOnStartup: true,
			});

			const service = createService();
			await service.reload();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith(
				expect.objectContaining({ mode: 'log', blockedIpRanges: FLOOR }),
			);
		});
	});

	describe('editable / managedByEnv', () => {
		it('is editable by default', () => {
			expect(createService().editable).toBe(true);
		});

		it('is not editable when N8N_EGRESS_PROTECTION_EDITABLE is false', () => {
			expect(createService({ editable: false } as Partial<SsrfProtectionConfig>).editable).toBe(
				false,
			);
		});

		it('is not editable and reports managedByEnv when managed by env', () => {
			const service = createService({}, { egressProtectionManagedByEnv: true });
			expect(service.editable).toBe(false);
			expect(service.managedByEnv).toBe(true);
		});
	});

	describe('updatePolicy', () => {
		it('persists (floor stripped, trimmed, deduped), applies, and broadcasts', async () => {
			const service = createService();
			await service.updatePolicy(
				{
					mode: 'enforce',
					blockedIpRanges: [' 100.64.0.0/10 ', '100.64.0.0/10', '10.0.0.0/8'],
					allowedIpRanges: [],
					allowedHostnames: ['api.internal'],
					blockedHostnames: [' *.tracker.example ', '*.tracker.example'],
				},
				'user-1',
			);

			expect(upsert).toHaveBeenCalledWith(
				expect.objectContaining({ key: EGRESS_POLICY_KEY, loadOnStartup: true }),
				['key'],
			);
			const stored = JSON.parse(upsert.mock.calls[0][0].value);
			// '10.0.0.0/8' is a built-in floor entry, so it is not stored.
			expect(stored.blockedIpRanges).toEqual(['100.64.0.0/10']);
			expect(stored.blockedHostnames).toEqual(['*.tracker.example']);
			expect(stored.updatedBy).toBe('user-1');

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'enforce',
					blockedIpRanges: union(FLOOR, ['100.64.0.0/10']),
				}),
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'egress-policy-changed' });
		});

		it('rejects when editing is disabled', async () => {
			const service = createService({ editable: false } as Partial<SsrfProtectionConfig>);

			await expect(
				service.updatePolicy({
					mode: 'log',
					blockedIpRanges: [],
					allowedIpRanges: [],
					allowedHostnames: [],
					blockedHostnames: [],
				}),
			).rejects.toThrow(UserError);

			expect(upsert).not.toHaveBeenCalled();
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('rejects when the policy is managed by env', async () => {
			const service = createService({}, { egressProtectionManagedByEnv: true });

			await expect(
				service.updatePolicy({
					mode: 'log',
					blockedIpRanges: [],
					allowedIpRanges: [],
					allowedHostnames: [],
					blockedHostnames: [],
				}),
			).rejects.toThrow(UserError);

			expect(upsert).not.toHaveBeenCalled();
		});

		it('still persists and applies locally when the pubsub broadcast fails', async () => {
			publisher.publishCommand.mockRejectedValue(new Error('redis down'));
			const service = createService();

			await expect(
				service.updatePolicy({
					mode: 'log',
					blockedIpRanges: [],
					allowedIpRanges: [],
					allowedHostnames: [],
					blockedHostnames: [],
				}),
			).resolves.toBeUndefined();

			expect(upsert).toHaveBeenCalled();
			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalled();
		});
	});

	describe('seedFromEnv', () => {
		it('skips (no write) when a policy row already exists and not managed by env', async () => {
			findByKey.mockResolvedValue(storedPolicy({ mode: 'enforce' }));
			const service = createService();

			expect(await service.seedFromEnv({ force: false })).toBe('skipped');
			expect(upsert).not.toHaveBeenCalled();
		});

		it('seeds the env policy (floor stripped, no audit fields) when no row exists', async () => {
			const service = createService({
				mode: 'enforce',
				blockedIpRanges: [...FLOOR, '100.64.0.0/10'],
			} as Partial<SsrfProtectionConfig>);

			expect(await service.seedFromEnv({ force: false })).toBe('created');

			const stored = JSON.parse(upsert.mock.calls[0][0].value);
			expect(stored.mode).toBe('enforce');
			expect(stored.blockedIpRanges).toEqual(['100.64.0.0/10']);
			expect(stored.updatedBy).toBeUndefined();
			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'enforce',
					blockedIpRanges: union(FLOOR, ['100.64.0.0/10']),
				}),
			);
		});

		it('overwrites an existing row from env on every boot when forced (managed by env)', async () => {
			findByKey.mockResolvedValue(
				storedPolicy({ mode: 'enforce', blockedHostnames: ['admin.edited'] }),
			);
			const service = createService({ mode: 'log' } as Partial<SsrfProtectionConfig>);

			expect(await service.seedFromEnv({ force: true })).toBe('created');

			const stored = JSON.parse(upsert.mock.calls[0][0].value);
			expect(stored.mode).toBe('log');
			expect(stored.blockedHostnames).toEqual([]);
		});
	});

	describe('getState', () => {
		it('returns the stored policy plus the read-only built-in floor and flags', async () => {
			findByKey.mockResolvedValue(
				storedPolicy({
					mode: 'enforce',
					blockedIpRanges: ['100.64.0.0/10'],
					allowedIpRanges: [],
					allowedHostnames: ['api.internal'],
					blockedHostnames: ['*.tracker.example'],
					updatedAt: '2026-06-24T00:00:00.000Z',
				}),
			);

			const service = createService();
			const state = await service.getState();

			expect(state).toEqual({
				mode: 'enforce',
				editable: true,
				managedByEnv: false,
				defaultBlockedIpRanges: FLOOR,
				blockedIpRanges: ['100.64.0.0/10'],
				allowedIpRanges: [],
				allowedHostnames: ['api.internal'],
				blockedHostnames: ['*.tracker.example'],
				updatedAt: '2026-06-24T00:00:00.000Z',
			});
		});

		it('reports not editable and managedByEnv when the policy is managed by env', async () => {
			const service = createService({}, { egressProtectionManagedByEnv: true });
			const state = await service.getState();

			expect(state.editable).toBe(false);
			expect(state.managedByEnv).toBe(true);
		});

		it('reports not editable on a platform-locked instance', async () => {
			const service = createService({ editable: false } as Partial<SsrfProtectionConfig>);
			const state = await service.getState();

			expect(state.editable).toBe(false);
			expect(state.managedByEnv).toBe(false);
		});
	});

	describe('handleEgressPolicyChanged', () => {
		it('reloads from the DB without re-publishing', async () => {
			const service = createService();
			await service.handleEgressPolicyChanged();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalled();
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('init / shutdown', () => {
		it('is idempotent: a second init() does not schedule a second timer', async () => {
			jest.useFakeTimers();
			const setIntervalSpy = jest.spyOn(global, 'setInterval');
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
			const service = createService();

			await service.init();
			await service.init();
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			service.shutdown();
			expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

			jest.useRealTimers();
		});

		it('keeps running on the env seed when the initial DB load fails', async () => {
			jest.useFakeTimers();
			const setIntervalSpy = jest.spyOn(global, 'setInterval');
			findByKey.mockRejectedValueOnce(new Error('db down'));
			const service = createService();

			// A transient DB error at startup must not abort init.
			await expect(service.init()).resolves.toBeUndefined();
			// The failed reload never reached applyEffective; the engine keeps its
			// constructor-compiled seed, and the interval backstop is still armed.
			expect(ssrfProtectionService.updatePolicy).not.toHaveBeenCalled();
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			service.shutdown();
			jest.useRealTimers();
		});
	});
});
