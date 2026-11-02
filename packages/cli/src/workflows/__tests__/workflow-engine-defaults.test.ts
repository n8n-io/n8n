import { ModuleRegistry } from '@n8n/backend-common';
import {
	type WorkflowEngineDefaultProvider,
	WorkflowEngineDefaultProviderProxy,
} from '@n8n/backend-services';
import { EngineConfig, type EngineDefaultType } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { WorkflowEngineDefaults } from '@/workflows/workflow-engine-defaults';

describe('WorkflowEngineDefaults', () => {
	let engineConfig: EngineConfig;
	let moduleRegistry: ModuleRegistry;
	let proxy: WorkflowEngineDefaultProviderProxy;
	let provider: ReturnType<typeof mock<WorkflowEngineDefaultProvider>>;
	let defaults: WorkflowEngineDefaults;

	const pin = ({
		engineV2Active,
		defaultType,
		setByEnv,
		stored,
	}: {
		engineV2Active: boolean;
		defaultType: EngineDefaultType;
		setByEnv: boolean;
		stored: EngineDefaultType | undefined;
	}) => {
		vi.spyOn(moduleRegistry, 'isActive').mockImplementation(
			(name) => engineV2Active && name === 'engine-v2',
		);
		Object.assign(engineConfig, { defaultType, defaultTypeSetByEnv: setByEnv });
		provider.getDefaultEngine.mockResolvedValue(stored);
	};

	beforeEach(() => {
		engineConfig = new EngineConfig();
		moduleRegistry = new ModuleRegistry(mock(), mock(), mock(), mock(), mock());
		proxy = new WorkflowEngineDefaultProviderProxy();
		provider = mock<WorkflowEngineDefaultProvider>();
		proxy.registerProvider(provider);
		defaults = new WorkflowEngineDefaults(engineConfig, moduleRegistry, proxy);
	});

	describe('resolveDefault()', () => {
		it('resolves v1 without the engine-v2 module, and does not ask the provider', async () => {
			pin({ engineV2Active: false, defaultType: 'v2', setByEnv: true, stored: 'v2' });

			await expect(defaults.resolveDefault()).resolves.toBe('v1');
			expect(provider.getDefaultEngine).not.toHaveBeenCalled();
		});

		it.each(['v1', 'v2'] as const)(
			'resolves the env value %s over the stored value, and does not ask the provider',
			async (defaultType) => {
				const stored = defaultType === 'v1' ? 'v2' : 'v1';
				pin({ engineV2Active: true, defaultType, setByEnv: true, stored });

				await expect(defaults.resolveDefault()).resolves.toBe(defaultType);
				expect(provider.getDefaultEngine).not.toHaveBeenCalled();
			},
		);

		it.each(['v1', 'v2'] as const)(
			'resolves the stored value %s when the env does not set one',
			async (stored) => {
				pin({ engineV2Active: true, defaultType: 'v1', setByEnv: false, stored });

				await expect(defaults.resolveDefault()).resolves.toBe(stored);
				expect(provider.getDefaultEngine).toHaveBeenCalledOnce();
			},
		);

		it('resolves v1 when the provider has no stored value', async () => {
			pin({ engineV2Active: true, defaultType: 'v1', setByEnv: false, stored: undefined });

			await expect(defaults.resolveDefault()).resolves.toBe('v1');
		});

		it('resolves v1 when no provider is registered', async () => {
			defaults = new WorkflowEngineDefaults(
				engineConfig,
				moduleRegistry,
				new WorkflowEngineDefaultProviderProxy(),
			);
			pin({ engineV2Active: true, defaultType: 'v1', setByEnv: false, stored: 'v2' });

			await expect(defaults.resolveDefault()).resolves.toBe('v1');
		});
	});

	describe('applyTo()', () => {
		it('stamps v2 on a workflow without an engine', () => {
			expect(defaults.applyTo({ executionOrder: 'v1' }, 'v2')).toStrictEqual({
				executionOrder: 'v1',
				engineType: 'v2',
			});
			expect(defaults.applyTo(undefined, 'v2')).toStrictEqual({ engineType: 'v2' });
		});

		it('writes no engine when the default is v1', () => {
			expect(defaults.applyTo({ executionOrder: 'v1' }, 'v1')).toStrictEqual({
				executionOrder: 'v1',
			});
			expect(defaults.applyTo(undefined, 'v1')).toBeUndefined();
		});

		it.each([
			{ engineType: 'v1' as const, defaultEngine: 'v2' as const },
			{ engineType: 'v2' as const, defaultEngine: 'v1' as const },
		])(
			'keeps an explicit $engineType when the default is $defaultEngine',
			({ engineType, defaultEngine }) => {
				expect(defaults.applyTo({ engineType }, defaultEngine)).toStrictEqual({ engineType });
			},
		);
	});
});
