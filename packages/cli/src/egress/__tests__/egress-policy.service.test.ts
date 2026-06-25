import type { Logger } from '@n8n/backend-common';
import type { SsrfProtectionService, EgressPolicyInput } from '@n8n/backend-network';
import type { SsrfProtectionConfig } from '@n8n/config';
import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { EGRESS_POLICY_OVERRIDE_KEY, EgressPolicyService } from '../egress-policy.service';

describe('EgressPolicyService', () => {
	const baselineConfig = {
		mode: 'log' as const,
		editable: true,
		blockedIpRanges: ['10.0.0.0/8'],
		allowedIpRanges: [] as string[],
		allowedHostnames: [] as string[],
		blockedHostnames: [] as string[],
	};

	let ssrfConfig: SsrfProtectionConfig;
	let ssrfProtectionService: ReturnType<typeof mock<SsrfProtectionService>>;
	let findByKey: jest.Mock<Promise<Settings | null>, [string]>;
	let upsert: jest.Mock;
	let settingsRepository: SettingsRepository;
	let publisher: ReturnType<typeof mock<Publisher>>;
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });

	const createService = (configOverrides: Partial<SsrfProtectionConfig> = {}) => {
		ssrfConfig = { ...baselineConfig, ...configOverrides } as unknown as SsrfProtectionConfig;
		return new EgressPolicyService(
			ssrfConfig,
			ssrfProtectionService,
			settingsRepository,
			publisher,
			logger,
		);
	};

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
		it('applies the baseline when there is no override', async () => {
			const service = createService();
			await service.reload();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith<[EgressPolicyInput]>({
				mode: 'log',
				blockedIpRanges: ['10.0.0.0/8'],
				allowedIpRanges: [],
				allowedHostnames: [],
				blockedHostnames: [],
			});
		});

		it('composes baseline ⊕ override as a union, override mode winning', async () => {
			findByKey.mockResolvedValue({
				key: EGRESS_POLICY_OVERRIDE_KEY,
				value: JSON.stringify({
					mode: 'enforce',
					blockedIpRanges: ['172.16.0.0/12'],
					allowedIpRanges: ['10.5.0.0/24'],
					allowedHostnames: ['api.internal'],
					blockedHostnames: ['*.tracker.example'],
				}),
				loadOnStartup: true,
			});

			const service = createService({
				blockedHostnames: ['evil.example'],
			} as Partial<SsrfProtectionConfig>);
			await service.reload();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith<[EgressPolicyInput]>({
				mode: 'enforce',
				blockedIpRanges: ['10.0.0.0/8', '172.16.0.0/12'],
				allowedIpRanges: ['10.5.0.0/24'],
				allowedHostnames: ['api.internal'],
				blockedHostnames: ['evil.example', '*.tracker.example'],
			});
		});

		it('keeps the baseline mode when the override does not set one', async () => {
			findByKey.mockResolvedValue({
				key: EGRESS_POLICY_OVERRIDE_KEY,
				value: JSON.stringify({ blockedIpRanges: ['172.16.0.0/12'] }),
				loadOnStartup: true,
			});

			const service = createService({ mode: 'enforce' } as Partial<SsrfProtectionConfig>);
			await service.reload();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith(
				expect.objectContaining({ mode: 'enforce' }),
			);
		});

		it('ignores the override entirely when editing is disabled', async () => {
			findByKey.mockResolvedValue({
				key: EGRESS_POLICY_OVERRIDE_KEY,
				value: JSON.stringify({ mode: 'off', blockedIpRanges: ['8.8.8.8/32'] }),
				loadOnStartup: true,
			});

			const service = createService({ editable: false } as Partial<SsrfProtectionConfig>);
			await service.reload();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith<[EgressPolicyInput]>({
				mode: 'log',
				blockedIpRanges: ['10.0.0.0/8'],
				allowedIpRanges: [],
				allowedHostnames: [],
				blockedHostnames: [],
			});
		});

		it('falls back to the baseline when the stored override is corrupt', async () => {
			findByKey.mockResolvedValue({
				key: EGRESS_POLICY_OVERRIDE_KEY,
				value: 'not json',
				loadOnStartup: true,
			});

			const service = createService();
			await service.reload();

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith(
				expect.objectContaining({ mode: 'log', blockedIpRanges: ['10.0.0.0/8'] }),
			);
		});
	});

	describe('updateOverride', () => {
		it('persists, applies, and broadcasts the change', async () => {
			const service = createService();
			await service.updateOverride(
				{
					mode: 'enforce',
					blockedIpRanges: [' 172.16.0.0/12 ', '172.16.0.0/12'],
					allowedIpRanges: [],
					allowedHostnames: ['api.internal'],
					blockedHostnames: [' *.tracker.example ', '*.tracker.example'],
				},
				'user-1',
			);

			// Trimmed + deduped before persisting
			expect(upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					key: EGRESS_POLICY_OVERRIDE_KEY,
					loadOnStartup: true,
				}),
				['key'],
			);
			const stored = JSON.parse(upsert.mock.calls[0][0].value);
			expect(stored.blockedIpRanges).toEqual(['172.16.0.0/12']);
			expect(stored.blockedHostnames).toEqual(['*.tracker.example']);
			expect(stored.updatedBy).toBe('user-1');

			expect(ssrfProtectionService.updatePolicy).toHaveBeenCalledWith(
				expect.objectContaining({ mode: 'enforce' }),
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'egress-policy-changed' });
		});

		it('rejects when editing is disabled', async () => {
			const service = createService({ editable: false } as Partial<SsrfProtectionConfig>);

			await expect(
				service.updateOverride({
					blockedIpRanges: [],
					allowedIpRanges: [],
					allowedHostnames: [],
					blockedHostnames: [],
				}),
			).rejects.toThrow(UserError);

			expect(upsert).not.toHaveBeenCalled();
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('still persists and applies locally when the pubsub broadcast fails', async () => {
			publisher.publishCommand.mockRejectedValue(new Error('redis down'));
			const service = createService();

			await expect(
				service.updateOverride({
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

	describe('getState', () => {
		it('splits baseline and override entries per list', async () => {
			findByKey.mockResolvedValue({
				key: EGRESS_POLICY_OVERRIDE_KEY,
				value: JSON.stringify({
					mode: 'enforce',
					blockedIpRanges: ['172.16.0.0/12'],
					allowedIpRanges: [],
					allowedHostnames: ['api.internal'],
					blockedHostnames: ['*.tracker.example'],
					updatedAt: '2026-06-24T00:00:00.000Z',
				}),
				loadOnStartup: true,
			});

			const service = createService();
			const state = await service.getState();

			expect(state).toEqual(
				expect.objectContaining({
					mode: 'enforce',
					baselineMode: 'log',
					editable: true,
					blockedIpRanges: { baseline: ['10.0.0.0/8'], override: ['172.16.0.0/12'] },
					allowedHostnames: { baseline: [], override: ['api.internal'] },
					blockedHostnames: { baseline: [], override: ['*.tracker.example'] },
					updatedAt: '2026-06-24T00:00:00.000Z',
				}),
			);
		});

		it('reports the baseline as effective when editing is disabled', async () => {
			findByKey.mockResolvedValue({
				key: EGRESS_POLICY_OVERRIDE_KEY,
				value: JSON.stringify({ mode: 'enforce', blockedIpRanges: ['172.16.0.0/12'] }),
				loadOnStartup: true,
			});

			const service = createService({ editable: false } as Partial<SsrfProtectionConfig>);
			const state = await service.getState();

			expect(state.mode).toBe('log');
			expect(state.editable).toBe(false);
			expect(state.blockedIpRanges.override).toEqual([]);
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

		it('keeps running on the env baseline when the initial DB load fails', async () => {
			jest.useFakeTimers();
			const setIntervalSpy = jest.spyOn(global, 'setInterval');
			findByKey.mockRejectedValueOnce(new Error('db down'));
			const service = createService();

			// A transient DB error at startup must not abort init.
			await expect(service.init()).resolves.toBeUndefined();
			// The failed reload never reached applyEffective; the engine keeps its
			// constructor-compiled baseline, and the interval backstop is still armed.
			expect(ssrfProtectionService.updatePolicy).not.toHaveBeenCalled();
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			service.shutdown();
			jest.useRealTimers();
		});
	});
});
