import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

describe('TransportConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('defaults', () => {
		it('defaults every subsystem to redis', () => {
			const { transport } = Container.get(GlobalConfig);

			expect(transport.leaderElection).toBe('redis');
			expect(transport.cache).toBe('redis');
			expect(transport.pubsub).toBe('redis');
			expect(transport.queue).toBe('redis');
		});
	});

	describe('env overrides', () => {
		it('reads ipc for a single subsystem without affecting the others', () => {
			vi.stubEnv('N8N_TRANSPORT_LEADER_ELECTION', 'ipc');

			const { transport } = Container.get(GlobalConfig);

			expect(transport.leaderElection).toBe('ipc');
			expect(transport.cache).toBe('redis');
			expect(transport.pubsub).toBe('redis');
			expect(transport.queue).toBe('redis');
		});

		it('falls back to redis for an invalid value', () => {
			vi.stubEnv('N8N_TRANSPORT_CACHE', 'kafka');

			const { transport } = Container.get(GlobalConfig);

			expect(transport.cache).toBe('redis');
		});
	});
});
