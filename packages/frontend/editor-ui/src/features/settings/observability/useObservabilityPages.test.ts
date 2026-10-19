import { createPinia, setActivePinia } from 'pinia';
import { OTEL_SETTINGS_VIEW } from '@n8n/frontend-module-otel';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { defaultSettings } from '@n8n/frontend-test-utils';
import merge from 'lodash/merge';

import { VIEWS } from '@/app/constants';

import { useObservabilityPages } from './useObservabilityPages';

const canUserAccessRouteByName = vi.hoisted(() => vi.fn<(name: string) => boolean>(() => true));

vi.mock('vue-router', () => ({ useRouter: vi.fn(() => ({})) }));
vi.mock('@/app/composables/useUserHelpers', () => ({
	useUserHelpers: vi.fn(() => ({ canUserAccessRouteByName })),
}));

const setInstance = ({
	activeModules,
	logStreamingLicensed,
}: {
	activeModules: string[];
	logStreamingLicensed: boolean;
}) => {
	useSettingsStore().setSettings(
		merge({}, defaultSettings, {
			activeModules,
			enterprise: { logStreaming: logStreamingLicensed },
		}),
	);
};

describe('useObservabilityPages', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		canUserAccessRouteByName.mockReset().mockReturnValue(true);
	});

	describe('Log streaming', () => {
		it('opens while the module is active', () => {
			setInstance({ activeModules: ['log-streaming'], logStreamingLicensed: true });

			expect(useObservabilityPages().canOpenLogStreaming.value).toBe(true);
		});

		it('opens the paywall while the instance is unlicensed', () => {
			setInstance({ activeModules: [], logStreamingLicensed: false });

			expect(useObservabilityPages().canOpenLogStreaming.value).toBe(true);
		});

		it('stays hidden on a licensed instance that turned the module off', () => {
			setInstance({ activeModules: [], logStreamingLicensed: true });

			expect(useObservabilityPages().canOpenLogStreaming.value).toBe(false);
		});

		it('stays hidden from a user who cannot open the page', () => {
			setInstance({ activeModules: ['log-streaming'], logStreamingLicensed: true });
			canUserAccessRouteByName.mockImplementation((name) => name !== VIEWS.LOG_STREAMING_SETTINGS);

			expect(useObservabilityPages().canOpenLogStreaming.value).toBe(false);
		});
	});

	describe('OpenTelemetry', () => {
		it('opens while the module is active', () => {
			setInstance({ activeModules: ['otel'], logStreamingLicensed: true });

			expect(useObservabilityPages().canOpenOpenTelemetry.value).toBe(true);
		});

		it('stays hidden while the module is inactive', () => {
			setInstance({ activeModules: [], logStreamingLicensed: true });

			expect(useObservabilityPages().canOpenOpenTelemetry.value).toBe(false);
		});

		it('stays hidden from a user who cannot open the page', () => {
			setInstance({ activeModules: ['otel'], logStreamingLicensed: true });
			canUserAccessRouteByName.mockImplementation((name) => name !== OTEL_SETTINGS_VIEW);

			expect(useObservabilityPages().canOpenOpenTelemetry.value).toBe(false);
		});
	});
});
