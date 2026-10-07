import { mock } from 'vitest-mock-extended';

import type { ExternalSecretsManager } from '../external-secrets-manager.ee';
import { ExternalSecretsRefreshTask } from '../external-secrets-refresh.task';
import type { ExternalSecretsConfig } from '../external-secrets.config';

describe('ExternalSecretsRefreshTask', () => {
	const config = { updateInterval: 600 } as ExternalSecretsConfig;
	let manager = mock<ExternalSecretsManager>();
	let task = new ExternalSecretsRefreshTask(config, manager);

	beforeEach(() => {
		manager = mock<ExternalSecretsManager>();
		task = new ExternalSecretsRefreshTask(config, manager);
	});

	it('should refresh in every kind of instance every update interval', () => {
		expect(task.name).toBe('external-secrets-refresh');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 600 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({
			scope: 'instance',
			instanceTypes: ['main', 'worker', 'webhook'],
		});
	});

	it('should pass its signal to the secrets refresh', async () => {
		const signal = new AbortController().signal;

		await task.run(signal);

		expect(manager.updateSecrets).toHaveBeenCalledExactlyOnceWith(signal);
	});
});
