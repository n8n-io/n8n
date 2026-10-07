import type { ExperienceMode, FrontendModuleSettings } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

// settings() reads only a few flags from these services. Keep their heavy
// runtime out of this test.
vi.mock('../instance-ai.service', () => ({ InstanceAiService: class {} }));
vi.mock('../instance-ai-settings.service', () => ({ InstanceAiSettingsService: class {} }));

import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiModule } from '../instance-ai.module';
import { InstanceAiService } from '../instance-ai.service';

const MODES_ENABLED = 'N8N_EXPERIENCE_MODES_ENABLED';
const DEFAULT_MODE = 'N8N_EXPERIENCE_DEFAULT_MODE';

const stubServices = ({ agentEnabled = true } = {}) => {
	mockInstance(InstanceAiService, {
		areMcpConnectionsAvailable: () => true,
		isProxyEnabled: () => false,
	});
	mockInstance(InstanceAiSettingsService, {
		isAgentEnabled: () => agentEnabled,
		isLocalGatewayDisabled: () => true,
		isBrowserUseEnabled: () => false,
		getSandboxStatus: () => ({
			enabled: true,
			provider: 'n8n-sandbox',
			workflowBuilderAvailable: true,
			unavailableReason: null,
		}),
		isSetupCompleted: async () => true,
		isActivationCapped: () => false,
	});
};

const useExperienceConfig = (experienceModesEnabled: boolean, mode: ExperienceMode) => {
	mockInstance(GlobalConfig, {
		deployment: { type: 'default' },
		instanceAi: {
			runDebugEnabled: true,
			experienceModesEnabled,
			experienceDefaultMode: mode,
		},
	});
};

const loadSettings = async () => await new InstanceAiModule().settings();

describe('InstanceAiModule settings()', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
		stubServices();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	describe('experience', () => {
		it.each([
			{ enabled: false, defaultMode: 'simple' },
			{ enabled: false, defaultMode: 'power' },
			{ enabled: true, defaultMode: 'simple' },
			{ enabled: true, defaultMode: 'power' },
		] as const)(
			'reports enabled $enabled with default mode $defaultMode',
			async ({ enabled, defaultMode }) => {
				useExperienceConfig(enabled, defaultMode);

				const settings = await loadSettings();

				expect(settings.experience).toEqual({ enabled, defaultMode });
			},
		);

		// Both modes are Assistant surfaces, so the editor must not offer the switch without it.
		it.each([
			{ modesFlag: true, defaultMode: 'power' },
			{ modesFlag: true, defaultMode: 'simple' },
			{ modesFlag: false, defaultMode: 'simple' },
		] as const)(
			'reports the modes as off while the Assistant is off (flag $modesFlag, default $defaultMode)',
			async ({ modesFlag, defaultMode }) => {
				stubServices({ agentEnabled: false });
				useExperienceConfig(modesFlag, defaultMode);

				const settings = await loadSettings();

				expect(settings.enabled).toBe(false);
				expect(settings.experience).toEqual({ enabled: false, defaultMode });
			},
		);

		it('leaves the other instance AI settings as they are', async () => {
			useExperienceConfig(true, 'power');

			const settings = await loadSettings();

			expect(settings).toMatchObject({
				enabled: true,
				mcpConnectionsAvailable: true,
				localGatewayDisabled: true,
				browserUseEnabled: false,
				proxyEnabled: false,
				cloudManaged: false,
				setupCompleted: true,
				sandboxEnabled: true,
				workflowBuilderAvailable: true,
				sandboxUnavailableReason: null,
				runDebugEnabled: true,
				activationCapped: false,
			});
		});
	});

	// Uses the real config, so the test covers the path from env var to editor setting.
	describe('experience from environment variables', () => {
		beforeEach(() => {
			vi.stubEnv(MODES_ENABLED, undefined);
			vi.stubEnv(DEFAULT_MODE, undefined);
		});

		it('reports the modes as off with the simple default when nothing is set', async () => {
			const settings = await loadSettings();

			expect(settings.experience).toEqual({ enabled: false, defaultMode: 'simple' });
		});

		it('reports the values an admin sets', async () => {
			vi.stubEnv(MODES_ENABLED, 'true');
			vi.stubEnv(DEFAULT_MODE, 'power');

			const settings = await loadSettings();

			expect(settings.experience).toEqual({ enabled: true, defaultMode: 'power' });
		});

		it('reports simple when the default mode is not a known mode', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.stubEnv(MODES_ENABLED, 'true');
			vi.stubEnv(DEFAULT_MODE, 'builder');

			const settings = await loadSettings();

			expect(settings.experience).toEqual({ enabled: true, defaultMode: 'simple' });
			expect(warn).toHaveBeenCalledWith(expect.stringContaining(DEFAULT_MODE));
		});
	});

	// Type-level pins. The `typecheck` step catches a failure, not the test run.
	// ModuleInterface types settings() loosely, and @n8n/config repeats the mode union.
	describe('contract with the editor', () => {
		it('returns the shape the editor reads under the instance-ai key', () => {
			expectTypeOf<Awaited<ReturnType<InstanceAiModule['settings']>>>().toExtend<
				NonNullable<FrontendModuleSettings['instance-ai']>
			>();
		});

		it('uses the shared mode type for the configured default', () => {
			expectTypeOf<
				GlobalConfig['instanceAi']['experienceDefaultMode']
			>().toEqualTypeOf<ExperienceMode>();
		});
	});
});
