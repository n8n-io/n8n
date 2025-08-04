'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const get_1 = __importDefault(require('lodash/get'));
const set_1 = __importDefault(require('lodash/set'));
const task_requester_1 = require('@/task-runners/task-managers/task-requester');
class TestTaskRequester extends task_requester_1.TaskRequester {
	constructor() {
		super(...arguments);
		this.sentMessages = [];
	}
	sendMessage(message) {
		this.sentMessages.push(message);
	}
}
describe('TaskRequester', () => {
	let instance;
	const mockNodeTypes = (0, jest_mock_extended_1.mock)();
	const mockEventService = (0, jest_mock_extended_1.mock)();
	beforeEach(() => {
		instance = new TestTaskRequester(mockNodeTypes, mockEventService);
	});
	describe('handleRpc', () => {
		test.each([
			['logNodeOutput', ['hello world']],
			['helpers.assertBinaryData', [0, 'propertyName']],
			['helpers.getBinaryDataBuffer', [0, 'propertyName']],
			['helpers.prepareBinaryData', [Buffer.from('data').toJSON(), 'filename', 'mimetype']],
			['helpers.setBinaryDataBuffer', [{ data: '123' }, Buffer.from('data').toJSON()]],
			['helpers.binaryToString', [Buffer.from('data').toJSON(), 'utf8']],
			['helpers.httpRequest', [{ url: 'http://localhost' }]],
			['helpers.request', [{ url: 'http://localhost' }]],
		])('should handle %s rpc call', async (methodName, args) => {
			const executeFunctions = (0, set_1.default)({}, methodName.split('.'), jest.fn());
			const mockTask = (0, jest_mock_extended_1.mock)({
				taskId: 'taskId',
				data: {
					executeFunctions,
				},
			});
			instance.tasks.set('taskId', mockTask);
			await instance.handleRpc('taskId', 'callId', methodName, args);
			expect(instance.sentMessages).toEqual([
				{
					callId: 'callId',
					data: undefined,
					status: 'success',
					taskId: 'taskId',
					type: 'requester:rpcresponse',
				},
			]);
			expect((0, get_1.default)(executeFunctions, methodName.split('.'))).toHaveBeenCalledWith(
				...args,
			);
		});
		it('converts any serialized buffer arguments into buffers', async () => {
			const mockPrepareBinaryData = jest.fn().mockResolvedValue(undefined);
			const mockTask = (0, jest_mock_extended_1.mock)({
				taskId: 'taskId',
				data: {
					executeFunctions: {
						helpers: {
							prepareBinaryData: mockPrepareBinaryData,
						},
					},
				},
			});
			instance.tasks.set('taskId', mockTask);
			await instance.handleRpc('taskId', 'callId', 'helpers.prepareBinaryData', [
				Buffer.from('data').toJSON(),
				'filename',
				'mimetype',
			]);
			expect(mockPrepareBinaryData).toHaveBeenCalledWith(
				Buffer.from('data'),
				'filename',
				'mimetype',
			);
		});
		describe('errors', () => {
			it('sends method not allowed error if method is not in the allow list', async () => {
				const mockTask = (0, jest_mock_extended_1.mock)({
					taskId: 'taskId',
					data: {
						executeFunctions: {},
					},
				});
				instance.tasks.set('taskId', mockTask);
				await instance.handleRpc('taskId', 'callId', 'notAllowedMethod', []);
				expect(instance.sentMessages).toEqual([
					{
						callId: 'callId',
						data: 'Method not allowed',
						status: 'error',
						taskId: 'taskId',
						type: 'requester:rpcresponse',
					},
				]);
			});
			it('sends error if method throws', async () => {
				const error = new Error('Test error');
				const mockTask = (0, jest_mock_extended_1.mock)({
					taskId: 'taskId',
					data: {
						executeFunctions: {
							helpers: {
								assertBinaryData: jest.fn().mockRejectedValue(error),
							},
						},
					},
				});
				instance.tasks.set('taskId', mockTask);
				await instance.handleRpc('taskId', 'callId', 'helpers.assertBinaryData', []);
				expect(instance.sentMessages).toEqual([
					{
						callId: 'callId',
						data: error,
						status: 'error',
						taskId: 'taskId',
						type: 'requester:rpcresponse',
					},
				]);
			});
		});
	});
});
//# sourceMappingURL=task-manager.test.js.map
