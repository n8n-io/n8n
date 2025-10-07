import { log } from '@clack/prompts';
import type { Config } from '@oclif/core';
import { mock } from 'vitest-mock-extended';

import { commands } from '../index';

function isValidCommand(commandName: string): commandName is keyof typeof commands {
	return commandName in commands;
}

export type LogLevel = 'success' | 'warning' | 'error' | 'info';

export interface CommandResult {
	getLogMessages(type: LogLevel): string[];
}

export class CommandTester {
	static async run(commandLine: string): Promise<CommandResult> {
		const argv = commandLine.trim().split(/\s+/);
		const [commandName, ...restArgv] = argv;

		if (!isValidCommand(commandName)) {
			throw new Error(
				`Unknown command: ${commandName}. Available: ${Object.keys(commands).join(', ')}`,
			);
		}

		const CommandClass = commands[commandName];

		const command = new CommandClass(
			restArgv,
			mock<Config>({
				root: process.cwd(),
				name: '@n8n/node-cli',
				version: '1.0.0',
				runHook: async () => await Promise.resolve({ successes: [], failures: [] }),
			}),
		);

		await command.run();

		return {
			getLogMessages(type: LogLevel): string[] {
				const mockFn = vi.mocked(log[type]);
				return mockFn.mock.calls?.map((call) => call[0]) ?? [];
			},
		};
	}
}
