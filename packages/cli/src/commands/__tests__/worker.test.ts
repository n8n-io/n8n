import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';
import { RedisClientService } from '@/services/redis-client.service';

import { Worker } from '../worker';

mockInstance(RedisClientService);
mockInstance(PubSubRegistry);
mockInstance(Subscriber);
mockInstance(WorkerStatusService);

test('should instantiate WorkerStatusService during orchestration setup', async () => {
	const containerGetSpy = jest.spyOn(Container, 'get');

	await new Worker().initOrchestration();

	expect(containerGetSpy).toHaveBeenCalledWith(WorkerStatusService);
});
