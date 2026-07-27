import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { TelemetryService } from '@/app/plugins/telemetry';
import { useSettingsStore } from '@/app/stores/settings.store';
import { defineTelemetryEvents } from '@n8n/telemetry';
import merge from 'lodash/merge';
import { createPinia, setActivePinia } from 'pinia';
import { z } from 'zod/v4';

let telemetry: TelemetryService;

let settingsStore: ReturnType<typeof useSettingsStore>;

const MOCK_VERSION_CLI = '0.0.0';

describe('telemetry', () => {
	beforeAll(() => {
		telemetry = new TelemetryService();
		setActivePinia(createPinia());
		settingsStore = useSettingsStore();
		telemetry.init(
			{ enabled: true, config: { proxy: '', key: '', sourceConfig: '', url: '' } },
			{ versionCli: '1', instanceId: '1' },
		);
	});

	beforeEach(() => vitest.clearAllMocks());

	describe('identify', () => {
		it('Rudderstack identify method should be called when proving userId ', () => {
			const identifyFunction = vi.spyOn(window.rudderanalytics, 'identify');

			const userId = '1';
			const instanceId = '1';

			settingsStore.setSettings(
				merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
					deployment: {
						type: '',
					},
				}),
			);

			telemetry.identify({ instanceId, userId });
			expect(identifyFunction).toHaveBeenCalledTimes(1);
			expect(identifyFunction).toHaveBeenCalledWith(
				`${instanceId}#${userId}`,
				{ instance_id: instanceId },
				{ context: { ip: '0.0.0.0' } },
			);
		});

		it('Rudderstack identify method should be called when proving userId and versionCli ', () => {
			const identifyFunction = vi.spyOn(window.rudderanalytics, 'identify');

			const userId = '1';
			const instanceId = '1';
			const versionCli = '1';

			settingsStore.setSettings(
				merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
					deployment: {
						type: '',
					},
				}),
			);

			telemetry.identify({ instanceId, userId, versionCli });
			expect(identifyFunction).toHaveBeenCalledTimes(1);
			expect(identifyFunction).toHaveBeenCalledWith(
				`${instanceId}#${userId}`,
				{
					instance_id: instanceId,
					version_cli: versionCli,
				},
				{ context: { ip: '0.0.0.0' } },
			);
		});

		it('Rudderstack identify method should be called when proving userId and versionCli and projectId', () => {
			const identifyFunction = vi.spyOn(window.rudderanalytics, 'identify');

			const userId = '1';
			const instanceId = '1';
			const versionCli = '1';
			const projectId = '1';

			settingsStore.setSettings(
				merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
					deployment: {
						type: '',
					},
				}),
			);

			telemetry.identify({ instanceId, userId, versionCli, projectId });
			expect(identifyFunction).toHaveBeenCalledTimes(1);
			expect(identifyFunction).toHaveBeenCalledWith(
				`${instanceId}#${userId}#${projectId}`,
				{
					instance_id: instanceId,
					version_cli: versionCli,
				},
				{ context: { ip: '0.0.0.0' } },
			);
		});

		it('Rudderstack identify method should be called when proving userId and deployment type is cloud ', () => {
			const identifyFunction = vi.spyOn(window.rudderanalytics, 'identify');

			const userId = '1';
			const instanceId = '1';
			const versionCli = '1';
			const userCloudId = '1';

			settingsStore.setSettings(
				merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
					n8nMetadata: {
						userId: userCloudId,
					},
					deployment: {
						type: 'cloud',
					},
				}),
			);

			telemetry.identify({ instanceId, userId, versionCli });
			expect(identifyFunction).toHaveBeenCalledTimes(1);
			expect(identifyFunction).toHaveBeenCalledWith(
				`${instanceId}#${userId}`,
				{
					instance_id: instanceId,
					version_cli: versionCli,
					user_cloud_id: userCloudId,
				},
				{ context: { ip: '0.0.0.0' } },
			);
		});

		it('Rudderstack identify method should be called when proving userId and deployment type is cloud', () => {
			const identifyFunction = vi.spyOn(window.rudderanalytics, 'identify');

			const userId = '1';
			const instanceId = '1';
			const versionCli = '1';
			const userCloudId = '1';

			settingsStore.setSettings(
				merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
					n8nMetadata: {
						userId: userCloudId,
					},
					deployment: {
						type: 'cloud',
					},
				}),
			);

			telemetry.identify({ instanceId, userId, versionCli });
			expect(identifyFunction).toHaveBeenCalledTimes(1);
			expect(identifyFunction).toHaveBeenCalledWith(
				`${instanceId}#${userId}`,
				{
					instance_id: instanceId,
					version_cli: versionCli,
					user_cloud_id: userCloudId,
				},
				{ context: { ip: '0.0.0.0' } },
			);
		});

		it('Rudderstack reset method should be called when proving userId and deployment type is cloud', () => {
			const resetFunction = vi.spyOn(window.rudderanalytics, 'reset');

			const instanceId = '1';

			settingsStore.setSettings(
				merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
					deployment: {
						type: '',
					},
				}),
			);

			telemetry.identify({ instanceId });
			expect(resetFunction).toHaveBeenCalledTimes(1);
		});
	});

	describe('track function', () => {
		it('should call Rudderstack track method with correct parameters', () => {
			const trackFunction = vi.spyOn(window.rudderanalytics, 'track');

			const event = 'testEvent';
			const properties = { test: '1' };

			telemetry.track(event, properties);

			expect(trackFunction).toHaveBeenCalledTimes(1);
			expect(trackFunction).toHaveBeenCalledWith(
				event,
				{
					...properties,
					version_cli: MOCK_VERSION_CLI,
				},
				{ context: { ip: '0.0.0.0' } },
			);
		});

		it('should include the posthog session id in the parameters', () => {
			const trackFunction = vi.spyOn(window.rudderanalytics, 'track');
			vi.stubGlobal('posthog', {
				init: vi.fn(),
				get_session_id: vi.fn().mockReturnValue('test_session_id'),
			});

			const event = 'testEvent';
			const properties = { test: '1' };

			telemetry.track(event, properties);

			expect(trackFunction).toHaveBeenCalledTimes(1);
			expect(trackFunction).toHaveBeenCalledWith(
				event,
				expect.objectContaining({
					posthog_session_id: 'test_session_id',
				}),
				expect.any(Object),
			);

			vi.unstubAllGlobals();
		});
	});

	describe('track function with registry entries', () => {
		const TEST_TELEMETRY = defineTelemetryEvents({
			USER_TESTED_REGISTRY_ENTRY: {
				name: 'User tested registry entry',
				description: 'Fires when the registry entry pipeline is exercised in tests.',
				properties: z.object({ workflow_id: z.string() }),
			},
		});

		it('should emit the entry name and properties through the standard pipeline', () => {
			const trackFunction = vi.spyOn(window.rudderanalytics, 'track');

			telemetry.track(TEST_TELEMETRY.USER_TESTED_REGISTRY_ENTRY, { workflow_id: 'wf-1' });

			expect(trackFunction).toHaveBeenCalledTimes(1);
			expect(trackFunction).toHaveBeenCalledWith(
				'User tested registry entry',
				{
					workflow_id: 'wf-1',
					version_cli: MOCK_VERSION_CLI,
				},
				{ context: { ip: '0.0.0.0' } },
			);
		});

		it('should warn and still emit when properties do not match the schema', () => {
			const trackFunction = vi.spyOn(window.rudderanalytics, 'track');
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			expect(() =>
				telemetry.track(TEST_TELEMETRY.USER_TESTED_REGISTRY_ENTRY, {
					workflow_id: 123 as unknown as string,
				}),
			).not.toThrow();

			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('"User tested registry entry" failed schema validation'),
			);
			expect(trackFunction).toHaveBeenCalledWith(
				'User tested registry entry',
				expect.objectContaining({ workflow_id: 123 }),
				{ context: { ip: '0.0.0.0' } },
			);

			warnSpy.mockRestore();
		});

		it('should warn about schema mismatches even when RudderStack is not available', () => {
			const originalRudderanalytics = window.rudderanalytics;
			// @ts-expect-error simulating a disabled telemetry client
			window.rudderanalytics = undefined;
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			telemetry.track(TEST_TELEMETRY.USER_TESTED_REGISTRY_ENTRY, {
				workflow_id: 123 as unknown as string,
			});

			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('"User tested registry entry" failed schema validation'),
			);

			window.rudderanalytics = originalRudderanalytics;
			warnSpy.mockRestore();
		});
	});

	describe('trackNodeParametersValuesChange - advanced HITL', () => {
		it('tracks the enable event when Slack captureResponder is turned on', () => {
			const trackSpy = vi.spyOn(telemetry, 'track');

			telemetry.trackNodeParametersValuesChange('n8n-nodes-base.slack', {
				name: 'parameters.captureResponder',
				value: true,
			});

			expect(trackSpy).toHaveBeenCalledWith('User enabled advanced HITL', {
				node_type: 'n8n-nodes-base.slack',
			});
		});

		it('tracks the enable event when Telegram chatApproval is turned on', () => {
			const trackSpy = vi.spyOn(telemetry, 'track');

			telemetry.trackNodeParametersValuesChange('n8n-nodes-base.telegram', {
				name: 'parameters.chatApproval',
				value: true,
			});

			expect(trackSpy).toHaveBeenCalledWith('User enabled advanced HITL', {
				node_type: 'n8n-nodes-base.telegram',
			});
		});

		it('does not track the enable event when the toggle is turned off', () => {
			const trackSpy = vi.spyOn(telemetry, 'track');

			telemetry.trackNodeParametersValuesChange('n8n-nodes-base.slack', {
				name: 'parameters.captureResponder',
				value: false,
			});

			expect(trackSpy).not.toHaveBeenCalledWith('User enabled advanced HITL', expect.anything());
		});

		it('does not track the enable event for an unrelated parameter change', () => {
			const trackSpy = vi.spyOn(telemetry, 'track');

			telemetry.trackNodeParametersValuesChange('n8n-nodes-base.slack', {
				name: 'parameters.otherOptions.someField',
				value: true,
			});

			expect(trackSpy).not.toHaveBeenCalledWith('User enabled advanced HITL', expect.anything());
		});
	});
});
