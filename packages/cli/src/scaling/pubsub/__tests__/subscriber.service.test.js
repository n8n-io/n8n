'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const config_1 = __importDefault(require('@/config'));
const subscriber_service_1 = require('../subscriber.service');
describe('Subscriber', () => {
	beforeEach(() => {
		config_1.default.set('executions.mode', 'queue');
		jest.restoreAllMocks();
	});
	const client = (0, jest_mock_extended_1.mock)();
	const redisClientService = (0, jest_mock_extended_1.mock)({ createClient: () => client });
	describe('constructor', () => {
		it('should init Redis client in scaling mode', () => {
			const subscriber = new subscriber_service_1.Subscriber(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				redisClientService,
			);
			expect(subscriber.getClient()).toEqual(client);
		});
		it('should not init Redis client in regular mode', () => {
			config_1.default.set('executions.mode', 'regular');
			const subscriber = new subscriber_service_1.Subscriber(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				redisClientService,
			);
			expect(subscriber.getClient()).toBeUndefined();
		});
	});
	describe('shutdown', () => {
		it('should disconnect Redis client', () => {
			const subscriber = new subscriber_service_1.Subscriber(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				redisClientService,
			);
			subscriber.shutdown();
			expect(client.disconnect).toHaveBeenCalled();
		});
	});
	describe('subscribe', () => {
		it('should subscribe to pubsub channel', async () => {
			const subscriber = new subscriber_service_1.Subscriber(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				redisClientService,
			);
			await subscriber.subscribe('n8n.commands');
			expect(client.subscribe).toHaveBeenCalledWith('n8n.commands', expect.any(Function));
		});
	});
});
//# sourceMappingURL=subscriber.service.test.js.map
