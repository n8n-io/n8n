import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { CommandMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import glob from 'fast-glob';
import picocolors from 'picocolors';
import argvParser from 'yargs-parser';

@Service()
export class CommandRegistry {
	private readonly commandName: string;

	private readonly argv: argvParser.Arguments;

	constructor(
		private readonly commandMetadata: CommandMetadata,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly logger: Logger,
	) {
		this.argv = argvParser(process.argv.slice(2));
		this.commandName = process.argv[2] ?? 'start';
	}

	async execute() {
		if (this.commandName === '--help') {
			await this.listAllCommands();
			process.exit(0);
		}

		// Try to load regular commands
		try {
			await import(`./commands/${this.commandName.replaceAll(':', '/')}.js`);
		} catch {}

		// Load modules to ensure all module commands are registered
		await this.moduleRegistry.loadModules();

		const CommandEntry = this.commandMetadata.get(this.commandName);
		if (!CommandEntry) {
			this.logger.error(picocolors.red(`Error: Command "${this.commandName}" not found`));
			process.exit(1);
		}

		if (this.argv.help) {
			// TODO: print command usage from the flags schema and then print the examples
			this.logger.info('print command usage');
			process.exit(0);
		}

		const command = Container.get(CommandEntry.class);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		command.flags = CommandEntry.flagsSchema?.parse(this.argv) ?? {};

		let error: Error | undefined = undefined;
		try {
			await command.init?.();
			await command.run();
		} catch (e) {
			error = e as Error;
			await command.catch?.(error);
		} finally {
			await command.finally?.(error);
		}
	}

	private async listAllCommands() {
		// Import all command files to register all the non-module commands
		const commandFiles = await glob('./commands/**/*.js', {
			ignore: ['**/__tests__/**'],
			cwd: __dirname,
		});
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		await Promise.all(commandFiles.map(async (filePath) => await import(filePath)));

		// Load/List module commands after legacy commands
		await this.moduleRegistry.loadModules();

		this.logger.info('Available commands:');

		for (const [name, { description }] of this.commandMetadata.getEntries()) {
			this.logger.info(
				`  ${picocolors.bold(picocolors.green(name))}: \n    ${description.split('\n')[0]}`,
			);
		}

		this.logger.info(
			'\nFor more detailed information, visit:\nhttps://docs.n8n.io/hosting/cli-commands/',
		);
	}
}
