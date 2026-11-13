import { MAX_PUBSUB_PAYLOAD_BYTES } from '@n8n/backend-services';

import { pubSubPayloadBytes } from '../agent-cluster.service';
import { testCluster } from './test-utils/cluster';

describe('AgentClusterService', () => {
	it('relays across processes in queue mode with one main', () => {
		const cluster = testCluster({ queue: true, multipleMains: false });
		expect(cluster.shouldRelayAcrossProcesses()).toBe(true);
		expect(cluster.hasMultipleMains()).toBe(false);
	});

	it('does not relay outside queue mode', () => {
		expect(testCluster().shouldRelayAcrossProcesses()).toBe(false);
	});

	it('reports multiple mains and the instance type', () => {
		const cluster = testCluster({ queue: true, multipleMains: true, instanceType: 'worker' });
		expect(cluster.hasMultipleMains()).toBe(true);
		expect(cluster.isWorker).toBe(true);
		expect(cluster.isMain).toBe(false);
	});

	it('rejects payloads larger than one pub/sub message', () => {
		const cluster = testCluster({ queue: true });
		expect(cluster.fitsInPubSubMessage({ text: 'small' })).toBe(true);
		expect(cluster.fitsInPubSubMessage({ text: 'a'.repeat(MAX_PUBSUB_PAYLOAD_BYTES) })).toBe(false);
	});

	it('counts bytes, not characters', () => {
		expect(pubSubPayloadBytes('é')).toBe(Buffer.byteLength('"é"'));
	});
});
