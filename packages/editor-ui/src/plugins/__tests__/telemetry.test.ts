import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { Telemetry } from '@/plugins/telemetry';
import { useSettingsStore } from '@/stores/settings.store';
import merge from 'lodash-es/merge';
import { createPinia, setActivePinia } from 'pinia';

let telemetry: Telemetry;

let settingsStore: ReturnType<typeof useSettingsStore>;

describe('telemetry', () => {
	beforeAll(() => {
		telemetry = new Telemetry();
		setActivePinia(createPinia());
		settingsStore = useSettingsStore();
		telemetry.init(
			{ enabled: true, config: { url: '', key: '' } },
			{ versionCli: '1', instanceId: '1' },
		);
	});

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

			telemetry.identify(userId, instanceId);
			expect(identifyFunction).toHaveBeenCalledTimes(1);
			expect(identifyFunction).toHaveBeenCalledWith(`${instanceId}#${userId}`, {
				instance_id: instanceId,
			});
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

			telemetry.identify(userId, instanceId, versionCli);
			expect(identifyFunction).toHaveBeenCalledTimes(1);
			expect(identifyFunction).toHaveBeenCalledWith(`${instanceId}#${userId}`, {
				instance_id: instanceId,
				version_cli: versionCli,
			});
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

			telemetry.identify(userId, instanceId, versionCli);
			expect(identifyFunction).toHaveBeenCalledTimes(1);
			expect(identifyFunction).toHaveBeenCalledWith(`${instanceId}#${userId}`, {
				instance_id: instanceId,
				version_cli: versionCli,
				user_cloud_id: userCloudId,
			});
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

			telemetry.identify(userId, instanceId, versionCli);
			expect(identifyFunction).toHaveBeenCalledTimes(1);
			expect(identifyFunction).toHaveBeenCalledWith(`${instanceId}#${userId}`, {
				instance_id: instanceId,
				version_cli: versionCli,
				user_cloud_id: userCloudId,
			});
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

			telemetry.identify(instanceId);
			expect(resetFunction).toHaveBeenCalledTimes(1);
		});
	});
});
