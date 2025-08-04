'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const config_1 = __importDefault(require('@/config'));
const publisher_service_1 = require('../publisher.service');
describe('Publisher', () => {
	beforeEach(() => {
		config_1.default.set('executions.mode', 'queue');
	});
	const client = (0, jest_mock_extended_1.mock)();
	const logger = (0, backend_test_utils_1.mockLogger)();
	const hostId = 'main-bnxa1riryKUNHtln';
	const instanceSettings = (0, jest_mock_extended_1.mock)({ hostId });
	const redisClientService = (0, jest_mock_extended_1.mock)({ createClient: () => client });
	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const publisher = new publisher_service_1.Publisher(
				logger,
				redisClientService,
				instanceSettings,
			);
			expect(publisher.getClient()).toEqual(client);
		});
		it('should not init Redis client in regular mode', () => {
			config_1.default.set('executions.mode', 'regular');
			const publisher = new publisher_service_1.Publisher(
				logger,
				redisClientService,
				instanceSettings,
			);
			expect(publisher.getClient()).toBeUndefined();
		});
	});
	describe('shutdown', () => {
		it('should disconnect Redis client', () => {
			const publisher = new publisher_service_1.Publisher(
				logger,
				redisClientService,
				instanceSettings,
			);
			publisher.shutdown();
			expect(client.disconnect).toHaveBeenCalled();
		});
	});
	describe('publishCommand', () => {
		it('should do nothing if not in scaling mode', async () => {
			config_1.default.set('executions.mode', 'regular');
			const publisher = new publisher_service_1.Publisher(
				logger,
				redisClientService,
				instanceSettings,
			);
			const msg = (0, jest_mock_extended_1.mock)({ command: 'reload-license' });
			await publisher.publishCommand(msg);
			expect(client.publish).not.toHaveBeenCalled();
		});
		it('should publish command into `n8n.commands` pubsub channel', async () => {
			const publisher = new publisher_service_1.Publisher(
				logger,
				redisClientService,
				instanceSettings,
			);
			const msg = (0, jest_mock_extended_1.mock)({ command: 'reload-license' });
			await publisher.publishCommand(msg);
			expect(client.publish).toHaveBeenCalledWith(
				'n8n.commands',
				JSON.stringify({ ...msg, senderId: hostId, selfSend: false, debounce: true }),
			);
		});
		it('should not debounce `add-webhooks-triggers-and-pollers`', async () => {
			const publisher = new publisher_service_1.Publisher(
				logger,
				redisClientService,
				instanceSettings,
			);
			const msg = (0, jest_mock_extended_1.mock)({ command: 'add-webhooks-triggers-and-pollers' });
			await publisher.publishCommand(msg);
			expect(client.publish).toHaveBeenCalledWith(
				'n8n.commands',
				JSON.stringify({
					...msg,
					_isMockObject: true,
					senderId: hostId,
					selfSend: true,
					debounce: false,
				}),
			);
		});
		it('should not debounce `remove-triggers-and-pollers`', async () => {
			const publisher = new publisher_service_1.Publisher(
				logger,
				redisClientService,
				instanceSettings,
			);
			const msg = (0, jest_mock_extended_1.mock)({ command: 'remove-triggers-and-pollers' });
			await publisher.publishCommand(msg);
			expect(client.publish).toHaveBeenCalledWith(
				'n8n.commands',
				JSON.stringify({
					...msg,
					_isMockObject: true,
					senderId: hostId,
					selfSend: true,
					debounce: false,
				}),
			);
		});
	});
	describe('publishWorkerResponse', () => {
		it('should publish worker response into `n8n.worker-response` pubsub channel', async () => {
			const publisher = new publisher_service_1.Publisher(
				logger,
				redisClientService,
				instanceSettings,
			);
			const msg = (0, jest_mock_extended_1.mock)({
				response: 'response-to-get-worker-status',
			});
			await publisher.publishWorkerResponse(msg);
			expect(client.publish).toHaveBeenCalledWith('n8n.worker-response', JSON.stringify(msg));
		});
	});
});
//# sourceMappingURL=publisher.service.test.js.map
