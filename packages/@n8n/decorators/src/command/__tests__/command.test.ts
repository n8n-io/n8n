import { Container } from '@n8n/di';
import { z } from 'zod';

import { Command } from '../command';
import { CommandMetadata } from '../command-metadata';

describe('@Command decorator', () => {
	let commandMetadata: CommandMetadata;

	beforeEach(() => {
		jest.resetAllMocks();
		Container.reset();

		commandMetadata = new CommandMetadata();
		Container.set(CommandMetadata, commandMetadata);
	});

	it('should register command in CommandMetadata', () => {
		@Command({
			name: 'test',
			description: 'Test command',
			examples: ['example usage'],
			flagsSchema: z.object({}),
		})
		class TestCommand {
			async run() {}
		}

		const registeredCommands = commandMetadata.getEntries();

		expect(registeredCommands).toHaveLength(1);
		const [commandName, entry] = registeredCommands[0];
		expect(commandName).toBe('test');
		expect(entry.class).toBe(TestCommand);
	});

	it('should register multiple commands', () => {
		@Command({
			name: 'first-command',
			description: 'First test command',
			examples: ['example 1'],
			flagsSchema: z.object({}),
		})
		class FirstCommand {
			async run() {}
		}

		@Command({
			name: 'second-command',
			description: 'Second test command',
			examples: ['example 2'],
			flagsSchema: z.object({}),
		})
		class SecondCommand {
			async run() {}
		}

		@Command({
			name: 'third-command',
			description: 'Third test command',
			examples: ['example 3'],
			flagsSchema: z.object({}),
		})
		class ThirdCommand {
			async run() {}
		}

		const registeredCommands = commandMetadata.getEntries();

		expect(registeredCommands).toHaveLength(3);
		expect(commandMetadata.get('first-command')?.class).toBe(FirstCommand);
		expect(commandMetadata.get('second-command')?.class).toBe(SecondCommand);
		expect(commandMetadata.get('third-command')?.class).toBe(ThirdCommand);
	});

	it('should apply Service decorator', () => {
		@Command({
			name: 'test',
			description: 'Test command',
			examples: ['example usage'],
			flagsSchema: z.object({}),
		})
		class TestCommand {
			async run() {}
		}

		expect(Container.has(TestCommand)).toBe(true);
	});

	it('stores the command metadata correctly', () => {
		const name = 'test-cmd';
		const description = 'Test command description';
		const examples = ['example 1', 'example 2'];
		const flagsSchema = z.object({
			flag1: z.string(),
			flag2: z.boolean().optional(),
		});

		@Command({
			name,
			description,
			examples,
			flagsSchema,
		})
		class TestCommand {
			async run() {}
		}

		const entry = commandMetadata.get(name);
		expect(entry).toBeDefined();
		expect(entry?.description).toBe(description);
		expect(entry?.examples).toEqual(examples);
		expect(entry?.flagsSchema).toBe(flagsSchema);
		expect(entry?.class).toBe(TestCommand);
	});
});
