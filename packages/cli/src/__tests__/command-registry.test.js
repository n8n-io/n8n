'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const fast_glob_1 = __importDefault(require('fast-glob'));
const jest_mock_extended_1 = require('jest-mock-extended');
const zod_1 = require('zod');
const command_registry_1 = require('../command-registry');
jest.mock('fast-glob');
describe('CommandRegistry', () => {
	let commandRegistry;
	let commandMetadata;
	const moduleRegistry = (0, jest_mock_extended_1.mock)();
	const logger = (0, jest_mock_extended_1.mock)();
	let originalProcessArgv;
	let mockProcessExit;
	const cliParser = new backend_common_1.CliParser(logger);
	class TestCommand {
		constructor() {
			this.flags = {};
			this.init = jest.fn();
			this.run = jest.fn();
			this.catch = jest.fn();
			this.finally = jest.fn();
		}
	}
	beforeEach(() => {
		jest.resetAllMocks();
		originalProcessArgv = process.argv;
		mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
		fast_glob_1.default.mockResolvedValue([]);
		commandMetadata = new decorators_1.CommandMetadata();
		di_1.Container.set(decorators_1.CommandMetadata, commandMetadata);
		commandMetadata.register('test-command', {
			description: 'Test command description',
			class: TestCommand,
			examples: ['--example'],
			flagsSchema: zod_1.z.object({
				flag1: zod_1.z.string().describe('Flag one description').optional(),
				flag2: zod_1.z.boolean().describe('Flag two description').optional(),
				shortFlag: zod_1.z.number().alias('s').describe('Short flag with alias').optional(),
			}),
		});
		di_1.Container.set(TestCommand, new TestCommand());
	});
	afterEach(() => {
		process.argv = originalProcessArgv;
		mockProcessExit.mockRestore();
		jest.resetAllMocks();
	});
	it('should execute the specified command', async () => {
		process.argv = ['node', 'n8n', 'test-command'];
		commandRegistry = new command_registry_1.CommandRegistry(
			commandMetadata,
			moduleRegistry,
			logger,
			cliParser,
		);
		await commandRegistry.execute();
		expect(moduleRegistry.loadModules).toHaveBeenCalled();
		const commandInstance = di_1.Container.get(commandMetadata.get('test-command').class);
		expect(commandInstance.init).toHaveBeenCalled();
		expect(commandInstance.run).toHaveBeenCalled();
		expect(commandInstance.finally).toHaveBeenCalledWith(undefined);
	});
	it('should handle command errors', async () => {
		process.argv = ['node', 'n8n', 'test-command'];
		const error = new Error('Test error');
		const commandClass = commandMetadata.get('test-command').class;
		const commandInstance = di_1.Container.get(commandClass);
		commandInstance.run = jest.fn().mockRejectedValue(error);
		commandRegistry = new command_registry_1.CommandRegistry(
			commandMetadata,
			moduleRegistry,
			logger,
			cliParser,
		);
		await commandRegistry.execute();
		expect(commandInstance.catch).toHaveBeenCalledWith(error);
		expect(commandInstance.finally).toHaveBeenCalledWith(error);
	});
	it('should parse and apply command flags', async () => {
		process.argv = ['node', 'n8n', 'test-command', '--flag1', 'value1', '--flag2', '-s', '123'];
		commandRegistry = new command_registry_1.CommandRegistry(
			commandMetadata,
			moduleRegistry,
			logger,
			cliParser,
		);
		await commandRegistry.execute();
		const commandInstance = di_1.Container.get(commandMetadata.get('test-command').class);
		expect(commandInstance.flags).toEqual({
			flag1: 'value1',
			flag2: true,
			shortFlag: 123,
		});
	});
	it('should handle alias flags', async () => {
		process.argv = ['node', 'n8n', 'test-command', '--flag1', 'value1', '-s', '123'];
		commandRegistry = new command_registry_1.CommandRegistry(
			commandMetadata,
			moduleRegistry,
			logger,
			cliParser,
		);
		await commandRegistry.execute();
		const commandInstance = di_1.Container.get(commandMetadata.get('test-command').class);
		expect(commandInstance.flags).toEqual({
			flag1: 'value1',
			shortFlag: 123,
		});
	});
	it('should exit with error when command not found', async () => {
		process.argv = ['node', 'n8n', 'non-existent-command'];
		commandRegistry = new command_registry_1.CommandRegistry(
			commandMetadata,
			moduleRegistry,
			logger,
			cliParser,
		);
		await commandRegistry.execute();
		expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
		expect(mockProcessExit).toHaveBeenCalledWith(1);
	});
	it('should display help when --help flag is used', async () => {
		process.argv = ['node', 'n8n', 'test-command', '--help'];
		commandRegistry = new command_registry_1.CommandRegistry(
			commandMetadata,
			moduleRegistry,
			logger,
			cliParser,
		);
		await commandRegistry.execute();
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('USAGE'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('FLAGS'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('DESCRIPTION'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('EXAMPLES'));
		expect(mockProcessExit).toHaveBeenCalledWith(0);
	});
	it('should list all commands when global help is requested', async () => {
		process.argv = ['node', 'n8n', '--help'];
		commandRegistry = new command_registry_1.CommandRegistry(
			commandMetadata,
			moduleRegistry,
			logger,
			cliParser,
		);
		await commandRegistry.execute();
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Available commands'));
		expect(mockProcessExit).toHaveBeenCalledWith(0);
	});
	it('should display proper command usage with printCommandUsage', () => {
		process.argv = ['node', 'n8n', 'test-command'];
		commandRegistry = new command_registry_1.CommandRegistry(
			commandMetadata,
			moduleRegistry,
			logger,
			cliParser,
		);
		const commandEntry = commandMetadata.get('test-command');
		commandRegistry.printCommandUsage(commandEntry);
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('USAGE'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('test-command'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('--flag1 <value>'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('-s, --shortFlag <value>'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Flag one description'));
	});
});
//# sourceMappingURL=command-registry.test.js.map
