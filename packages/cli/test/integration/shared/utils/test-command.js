'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.setupTestCommand = void 0;
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const yargs_parser_1 = __importDefault(require('yargs-parser'));
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const telemetry_event_relay_1 = require('@/events/relays/telemetry.event-relay');
(0, backend_test_utils_1.mockInstance)(message_event_bus_1.MessageEventBus);
const setupTestCommand = (Command) => {
	process.once = jest.fn();
	process.exit = jest.fn();
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
	});
	beforeEach(() => {
		jest.clearAllMocks();
		(0, backend_test_utils_1.mockInstance)(telemetry_event_relay_1.TelemetryEventRelay);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
		jest.restoreAllMocks();
	});
	const run = async (argv = []) => {
		const command = new Command();
		command.flags = (0, yargs_parser_1.default)(argv);
		await command.init?.();
		await command.run();
		return command;
	};
	return { run };
};
exports.setupTestCommand = setupTestCommand;
//# sourceMappingURL=test-command.js.map
