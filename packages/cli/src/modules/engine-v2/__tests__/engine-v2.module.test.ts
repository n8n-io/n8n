import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import { EngineDataPlaneClient } from '../engine-data-plane-client';
import { EngineV2Module } from '../engine-v2.module';
import { EngineV2Runtime } from '../engine-v2.runtime';

describe('EngineV2Module', () => {
	let module: EngineV2Module;
	let executionsConfig: ExecutionsConfig;
	let runtime: EngineV2Runtime;

	beforeEach(() => {
		vi.clearAllMocks();

		executionsConfig = mock<ExecutionsConfig>({ mode: 'regular' });
		runtime = mock<EngineV2Runtime>();

		Container.set(ExecutionsConfig, executionsConfig);
		Container.set(EngineV2Runtime, runtime);
		Container.set(EngineDataPlaneClient, mock<EngineDataPlaneClient>());
		Container.set(EngineDataPlaneProxyService, new EngineDataPlaneProxyService());

		module = new EngineV2Module();
	});

	describe('init', () => {
		it('refuses to start in queue mode', async () => {
			executionsConfig.mode = 'queue';

			await expect(module.init()).rejects.toThrow('does not support queue mode');
			expect(runtime.init).not.toHaveBeenCalled();
		});

		it('starts the runtime in regular mode', async () => {
			await module.init();

			expect(runtime.init).toHaveBeenCalled();
		});

		it('registers the client as the data plane provider', async () => {
			const proxy = Container.get(EngineDataPlaneProxyService);
			expect(proxy.isAvailable()).toBe(false);

			await module.init();

			expect(proxy.isAvailable()).toBe(true);
		});
	});

	describe('shutdown', () => {
		it('shuts the runtime down', async () => {
			await module.shutdown();

			expect(runtime.shutdown).toHaveBeenCalled();
		});
	});
});
