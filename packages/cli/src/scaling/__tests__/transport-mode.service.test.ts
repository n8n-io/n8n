import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { TransportModeService } from '../transport-mode.service';

type TransportConfig = GlobalConfig['transport'];

const makeService = (transport: TransportConfig) =>
	new TransportModeService(mock<GlobalConfig>({ transport }));

const allRedis: TransportConfig = {
	leaderElection: 'redis',
	cache: 'redis',
	pubsub: 'redis',
	queue: 'redis',
};

describe('TransportModeService', () => {
	describe('resolve', () => {
		it('returns each subsystem its configured value', () => {
			const service = makeService({ ...allRedis, leaderElection: 'ipc', queue: 'ipc' });

			expect(service.resolve('leaderElection')).toBe('ipc');
			expect(service.resolve('queue')).toBe('ipc');
			expect(service.resolve('cache')).toBe('redis');
			expect(service.resolve('pubsub')).toBe('redis');
		});
	});

	describe('validateAtBoot', () => {
		let original: string | undefined;

		beforeEach(() => {
			original = process.env.N8N_HYPERVISOR_MODE;
		});

		afterEach(() => {
			if (original === undefined) delete process.env.N8N_HYPERVISOR_MODE;
			else process.env.N8N_HYPERVISOR_MODE = original;
		});

		it('throws when leaderElection=ipc without a hypervisor', () => {
			delete process.env.N8N_HYPERVISOR_MODE;
			const service = makeService({ ...allRedis, leaderElection: 'ipc' });

			expect(() => service.validateAtBoot()).toThrow('requires running under `n8n hypervisor`');
		});

		it('passes when leaderElection=ipc under a hypervisor', () => {
			process.env.N8N_HYPERVISOR_MODE = '1';
			const service = makeService({ ...allRedis, leaderElection: 'ipc' });

			expect(() => service.validateAtBoot()).not.toThrow();
		});

		it('passes when leaderElection=redis regardless of hypervisor', () => {
			delete process.env.N8N_HYPERVISOR_MODE;
			const service = makeService(allRedis);

			expect(() => service.validateAtBoot()).not.toThrow();
		});
	});
});
