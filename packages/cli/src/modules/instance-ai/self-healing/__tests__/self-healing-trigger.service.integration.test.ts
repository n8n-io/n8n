import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { RedisClientService } from '@n8n/backend-services';
import { ExecutionsConfig, GlobalConfig, InstanceAiConfig } from '@n8n/config';
import { SharedWorkflowRepository, type Project } from '@n8n/db';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { InstanceSettings } from 'n8n-core';
import { Redis } from 'ioredis';
import { mock } from 'vitest-mock-extended';

import { PubSubEventBus } from '@/scaling/pubsub/pubsub.eventbus';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { Subscriber } from '@/scaling/pubsub/subscriber.service';

import { SelfHealingInvestigationService } from '../self-healing-investigation.service';
import { SelfHealingTriggerService } from '../self-healing-trigger.service';

vi.mock('../self-healing-investigation.service', () => ({
	SelfHealingInvestigationService: vi.fn(),
}));

const host = process.env.N8N_TEST_REDIS_HOST;
const port = Number(process.env.N8N_TEST_REDIS_PORT);

describe.skipIf(!host || !port)('self-healing failure relay (real Redis)', () => {
	const logger = mockLogger();
	const config = mock<InstanceAiConfig>({ workflowSuggestionsEnabled: true });
	const ownership = mock<SharedWorkflowRepository>();
	const investigations = mockInstance(SelfHealingInvestigationService);
	const main = mock<InstanceSettings>({ instanceType: 'main', hostId: 'main' });
	const worker = mock<InstanceSettings>({ instanceType: 'worker', hostId: 'worker' });
	const executionsConfig = mock<ExecutionsConfig>({ mode: 'queue' });
	const globalConfig = Container.get(GlobalConfig);
	globalConfig.redis.prefix = `self-healing-test-${process.pid}-${Date.now()}`;
	const redis = mock<RedisClientService>();
	let publisher: Publisher;
	let subscriber: Subscriber;
	let workerTrigger: SelfHealingTriggerService;
	let bus: PubSubEventBus;

	beforeAll(async () => {
		redis.createClient.mockImplementation(() => new Redis({ host, port }));
		publisher = new Publisher(logger, redis, worker, executionsConfig, globalConfig);
		bus = new PubSubEventBus();
		subscriber = new Subscriber(logger, main, bus, redis, executionsConfig, globalConfig);

		const mainTrigger = new SelfHealingTriggerService(config, main, publisher, ownership, logger);
		Container.set(SelfHealingTriggerService, mainTrigger);
		const registry = new PubSubRegistry(logger, main, Container.get(PubSubMetadata), bus);
		registry.init();

		workerTrigger = new SelfHealingTriggerService(config, worker, publisher, ownership, logger);
		ownership.getWorkflowOwningProject.mockResolvedValue(mock<Project>({ id: 'project' }));

		await subscriber.subscribe(subscriber.getCommandChannel());
	});

	afterAll(() => {
		bus?.removeAllListeners();
		subscriber?.shutdown();
		publisher?.shutdown();
	});

	it('delivers consecutive failures to main without debounce or a worker-side start', async () => {
		const delivered = createDeferredPromise();
		investigations.start.mockResolvedValueOnce(null).mockImplementationOnce(async () => {
			delivered.resolve();
			return null;
		});

		await workerTrigger.handleFailure({ workflowId: 'workflow-1', executionId: '1' });
		await workerTrigger.handleFailure({ workflowId: 'workflow-2', executionId: '2' });

		// Use the test timeout for Redis delivery instead of a one-second polling limit.
		await delivered.promise;
		expect(investigations.start).toHaveBeenCalledTimes(2);
		expect(investigations.start).toHaveBeenCalledWith({
			workflowId: 'workflow-1',
			executionId: '1',
			projectId: 'project',
		});
		expect(investigations.start).toHaveBeenCalledWith({
			workflowId: 'workflow-2',
			executionId: '2',
			projectId: 'project',
		});
	});
});
