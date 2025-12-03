import { CliParser, Logger, ModuleRegistry } from '@n8n/backend-common';
import { CommandMetadata, type CommandEntry } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import glob from 'fast-glob';
import picocolors from 'picocolors';
import { z } from 'zod';
import './zod-alias-support';

/**
 * Registry that manages CLI commands, their execution, and metadata.
 * Handles command discovery, flag parsing, and execution lifecycle.
 */
@Service()
export class CommandRegistry {
	private commandName: string;

	constructor(
		private readonly commandMetadata: CommandMetadata,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly logger: Logger,
		private readonly cliParser: CliParser,
	) {
		this.commandName = process.argv[2] ?? 'start';
	}

	async execute() {
		if (this.commandName === '--help' || this.commandName === '-h') {
			await this.listAllCommands();
			return process.exit(0);
		}

		if (this.commandName === 'executeBatch') {
			this.logger.warn('WARNING: "executeBatch" has been renamed to "execute-batch".');
			this.commandName = 'execute-batch';
		}

		// Try to load regular commands
		try {
			await import(`./commands/${this.commandName.replaceAll(':', '/')}.js`);
		} catch {}

		// Load modules to ensure all module commands are registered
		await this.moduleRegistry.loadModules();

		const commandEntry = this.commandMetadata.get(this.commandName);
		if (!commandEntry) {
			this.logger.error(picocolors.red(`Error: Command "${this.commandName}" not found`));
			return process.exit(1);
		}

		if (process.argv.includes('--help') || process.argv.includes('-h')) {
			this.printCommandUsage(commandEntry);
			return process.exit(0);
		}

		const { flags } = this.cliParser.parse({
			argv: process.argv,
			flagsSchema: commandEntry.flagsSchema,
		});

		const command = Container.get(commandEntry.class);
		command.flags = flags;

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

	async listAllCommands() {
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

	printCommandUsage(commandEntry: CommandEntry) {
		const { commandName } = this;
		let output = '';

		output += `${picocolors.bold('USAGE')}\n`;
		output += `  $ n8n ${commandName}\n\n`;

		const { flagsSchema } = commandEntry;
		if (flagsSchema && Object.keys(flagsSchema.shape).length > 0) {
			const flagLines: Array<[string, string]> = [];
			const flagEntries = Object.entries(
				z
					.object({
						help: z.boolean().alias('h').describe('Show CLI help'),
					})
					.merge(flagsSchema).shape,
			);
			for (const [flagName, flagSchema] of flagEntries) {
				let schemaDef = flagSchema._def as z.ZodTypeDef & {
					typeName: string;
					innerType?: z.ZodType;
				};
				if (schemaDef.typeName === 'ZodOptional' && schemaDef.innerType) {
					schemaDef = schemaDef.innerType._def as typeof schemaDef;
				}
				const typeName = schemaDef.typeName;

				let flagString = `--${flagName}`;
				if (schemaDef._alias) {
					flagString = `-${schemaDef._alias}, ${flagString}`;
				}
				if (['ZodString', 'ZodNumber', 'ZodArray'].includes(typeName)) {
					flagString += ' <value>';
				}

				let flagLine = flagSchema.description ?? '';
				if ('defaultValue' in schemaDef) {
					const defaultValue = (schemaDef as z.ZodDefaultDef).defaultValue() as unknown;
					flagLine += ` [default: ${String(defaultValue)}]`;
				}
				flagLines.push([flagString, flagLine]);
			}

			const flagColumnWidth = Math.max(...flagLines.map(([flagString]) => flagString.length));

			output += `${picocolors.bold('FLAGS')}\n`;
			output += flagLines
				.map(([flagString, flagLine]) => `  ${flagString.padEnd(flagColumnWidth)}  ${flagLine}`)
				.join('\n');
			output += '\n\n';
		}

		output += `${picocolors.bold('DESCRIPTION')}\n`;
		output += `  ${commandEntry.description}\n`;

		if (commandEntry.examples?.length) {
			output += `\n${picocolors.bold('EXAMPLES')}\n`;
			output += commandEntry.examples
				.map((example) => `  $ n8n ${commandName}${example ? ` ${example}` : ''}`)
				.join('\n');
			output += '\n';
		}

		this.logger.info(output);
	}
}
