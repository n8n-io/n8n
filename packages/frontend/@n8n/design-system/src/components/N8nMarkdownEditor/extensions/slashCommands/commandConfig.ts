import { getDefaultMarkdownSlashCommands } from './markdownCommands';
import type { MarkdownSlashCommand, MarkdownSlashCommandConfig } from './types';

export const DEFAULT_MARKDOWN_SLASH_COMMAND_DISABLED_NODES = ['codeBlock'];

export const mergeMarkdownSlashCommands = (
	baseCommands: MarkdownSlashCommand[],
	additionalCommands: MarkdownSlashCommand[],
) => {
	const commands = new Map(baseCommands.map((command) => [command.id, command]));

	for (const command of additionalCommands) {
		commands.set(command.id, command);
	}

	return [...commands.values()];
};

export const resolveMarkdownSlashCommandConfig = (config: MarkdownSlashCommandConfig = {}) => ({
	commands: mergeMarkdownSlashCommands(
		config.commands ?? getDefaultMarkdownSlashCommands(),
		config.additionalCommands ?? [],
	),
	disabledInNodes: config.disabledInNodes ?? DEFAULT_MARKDOWN_SLASH_COMMAND_DISABLED_NODES,
});
