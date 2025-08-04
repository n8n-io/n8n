'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const pubsub_registry_1 = require('@/scaling/pubsub/pubsub.registry');
const subscriber_service_1 = require('@/scaling/pubsub/subscriber.service');
const worker_status_service_ee_1 = require('@/scaling/worker-status.service.ee');
const redis_client_service_1 = require('@/services/redis-client.service');
const worker_1 = require('../worker');
(0, backend_test_utils_1.mockInstance)(redis_client_service_1.RedisClientService);
(0, backend_test_utils_1.mockInstance)(pubsub_registry_1.PubSubRegistry);
(0, backend_test_utils_1.mockInstance)(subscriber_service_1.Subscriber);
(0, backend_test_utils_1.mockInstance)(worker_status_service_ee_1.WorkerStatusService);
test('should instantiate WorkerStatusService during orchestration setup', async () => {
	const containerGetSpy = jest.spyOn(di_1.Container, 'get');
	await new worker_1.Worker().initOrchestration();
	expect(containerGetSpy).toHaveBeenCalledWith(worker_status_service_ee_1.WorkerStatusService);
});
//# sourceMappingURL=worker.test.js.map
