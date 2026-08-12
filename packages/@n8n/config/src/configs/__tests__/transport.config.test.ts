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
		it('defaults leader-election/pubsub/queue to redis, and cache/instance-registry to memory', () => {
			const { transport } = Container.get(GlobalConfig);

			expect(transport.leaderElection).toBe('redis');
			expect(transport.cache).toBe('memory');
			expect(transport.pubsub).toBe('redis');
			expect(transport.queue).toBe('redis');
			expect(transport.instanceRegistry).toBe('memory');
		});
	});

	describe('env overrides', () => {
		it('reads ipc for a single subsystem without affecting the others', () => {
			vi.stubEnv('N8N_TRANSPORT_LEADER_ELECTION', 'ipc');

			const { transport } = Container.get(GlobalConfig);

			expect(transport.leaderElection).toBe('ipc');
			expect(transport.cache).toBe('memory');
			expect(transport.pubsub).toBe('redis');
			expect(transport.queue).toBe('redis');
		});

		it('falls back to the default for an invalid value', () => {
			vi.stubEnv('N8N_TRANSPORT_PUBSUB', 'kafka');

			const { transport } = Container.get(GlobalConfig);

			expect(transport.pubsub).toBe('redis');
		});

		it('reads the three-value cache / instance-registry transports', () => {
			vi.stubEnv('N8N_TRANSPORT_CACHE', 'ipc');
			vi.stubEnv('N8N_TRANSPORT_INSTANCE_REGISTRY', 'ipc');

			const { transport } = Container.get(GlobalConfig);

			expect(transport.cache).toBe('ipc');
			expect(transport.instanceRegistry).toBe('ipc');
		});
	});
});
