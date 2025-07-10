import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import { CommandMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { z } from 'zod';

import { CommandRegistry } from '../command-registry';

jest.mock('fast-glob');

import glob from 'fast-glob';

describe('CommandRegistry', () => {
	let commandRegistry: CommandRegistry;
	let commandMetadata: CommandMetadata;
	const moduleRegistry = mock<ModuleRegistry>();
	const logger = mock<Logger>();
	let originalProcessArgv: string[];
	let mockProcessExit: jest.SpyInstance;

	class TestCommand {
		flags: any;

		init = jest.fn();

		run = jest.fn();

		catch = jest.fn();

		finally = jest.fn();
	}

	beforeEach(() => {
		jest.resetAllMocks();

		originalProcessArgv = process.argv;
		mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

		(glob as unknown as jest.Mock).mockResolvedValue([]);

		commandMetadata = new CommandMetadata();
		Container.set(CommandMetadata, commandMetadata);

		commandMetadata.register('test-command', {
			description: 'Test command description',
			class: TestCommand,
			examples: ['--example'],
			flagsSchema: z.object({
				flag1: z.string().describe('Flag one description').optional(),
				flag2: z.boolean().describe('Flag two description').optional(),
				shortFlag: z.number().alias('s').describe('Short flag with alias').optional(),
			}),
		});

		Container.set(TestCommand, new TestCommand());
	});

	afterEach(() => {
		process.argv = originalProcessArgv;
		mockProcessExit.mockRestore();
		jest.resetAllMocks();
	});

	it('should execute the specified command', async () => {
		process.argv = ['node', 'n8n', 'test-command'];

		commandRegistry = new CommandRegistry(commandMetadata, moduleRegistry, logger);
		await commandRegistry.execute();

		expect(moduleRegistry.loadModules).toHaveBeenCalled();

		const commandInstance = Container.get(commandMetadata.get('test-command')!.class);
		expect(commandInstance.init).toHaveBeenCalled();
		expect(commandInstance.run).toHaveBeenCalled();
		expect(commandInstance.finally).toHaveBeenCalledWith(undefined);
	});

	it('should handle command errors', async () => {
		process.argv = ['node', 'n8n', 'test-command'];

		const error = new Error('Test error');
		const commandClass = commandMetadata.get('test-command')!.class;
		const commandInstance = Container.get(commandClass);
		commandInstance.run = jest.fn().mockRejectedValue(error);

		commandRegistry = new CommandRegistry(commandMetadata, moduleRegistry, logger);
		await commandRegistry.execute();

		expect(commandInstance.catch).toHaveBeenCalledWith(error);
		expect(commandInstance.finally).toHaveBeenCalledWith(error);
	});

	it('should parse and apply command flags', async () => {
		process.argv = ['node', 'n8n', 'test-command', '--flag1', 'value1', '--flag2', '-s', '123'];

		commandRegistry = new CommandRegistry(commandMetadata, moduleRegistry, logger);
		await commandRegistry.execute();

		const commandInstance = Container.get(commandMetadata.get('test-command')!.class);
		expect(commandInstance.flags).toEqual({
			flag1: 'value1',
			flag2: true,
			shortFlag: 123,
		});
	});

	it('should handle alias flags', async () => {
		process.argv = ['node', 'n8n', 'test-command', '--flag1', 'value1', '-s', '123'];

		commandRegistry = new CommandRegistry(commandMetadata, moduleRegistry, logger);
		await commandRegistry.execute();

		const commandInstance = Container.get(commandMetadata.get('test-command')!.class);
		expect(commandInstance.flags).toEqual({
			flag1: 'value1',
			shortFlag: 123,
		});
	});

	it('should exit with error when command not found', async () => {
		process.argv = ['node', 'n8n', 'non-existent-command'];

		commandRegistry = new CommandRegistry(commandMetadata, moduleRegistry, logger);
		await commandRegistry.execute();

		expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
		expect(mockProcessExit).toHaveBeenCalledWith(1);
	});

	it('should display help when --help flag is used', async () => {
		process.argv = ['node', 'n8n', 'test-command', '--help'];

		commandRegistry = new CommandRegistry(commandMetadata, moduleRegistry, logger);
		await commandRegistry.execute();

		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('USAGE'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('FLAGS'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('DESCRIPTION'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('EXAMPLES'));
		expect(mockProcessExit).toHaveBeenCalledWith(0);
	});

	it('should list all commands when global help is requested', async () => {
		process.argv = ['node', 'n8n', '--help'];

		commandRegistry = new CommandRegistry(commandMetadata, moduleRegistry, logger);
		await commandRegistry.execute();

		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Available commands'));
		expect(mockProcessExit).toHaveBeenCalledWith(0);
	});

	it('should display proper command usage with printCommandUsage', () => {
		process.argv = ['node', 'n8n', 'test-command'];

		commandRegistry = new CommandRegistry(commandMetadata, moduleRegistry, logger);
		const commandEntry = commandMetadata.get('test-command')!;
		commandRegistry.printCommandUsage(commandEntry);

		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('USAGE'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('test-command'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('--flag1 <value>'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('-s, --shortFlag <value>'));
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Flag one description'));
	});
});
