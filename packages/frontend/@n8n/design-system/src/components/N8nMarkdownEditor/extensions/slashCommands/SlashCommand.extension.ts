import { Extension } from '@tiptap/core';
import type { Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionOptions } from '@tiptap/suggestion';

import { resolveMarkdownSlashCommandConfig } from './commandConfig';
import type { MarkdownSlashCommand, MarkdownSlashCommandConfig } from './types';

export type MarkdownSlashCommandOptions = MarkdownSlashCommandConfig & {
	commands: MarkdownSlashCommand[];
	disabledInNodes: string[];
	render?: SuggestionOptions<MarkdownSlashCommand, MarkdownSlashCommand>['render'];
};

const slashCommandPluginKey = new PluginKey('markdownSlashCommands');

export const filterMarkdownSlashCommands = (
	commands: MarkdownSlashCommand[],
	query: string,
): MarkdownSlashCommand[] => {
	const normalizeSearchValue = (value: string) => value.trim().toLocaleLowerCase();
	const normalizedQuery = normalizeSearchValue(query);

	if (!normalizedQuery) return commands;

	return commands.filter((command) =>
		[command.label, ...(command.aliases ?? [])].some((value) =>
			normalizeSearchValue(value).includes(normalizedQuery),
		),
	);
};

const isSelectionInsideDisabledNode = (
	state: EditorState,
	range: Range,
	disabledInNodes: string[],
) => {
	const $from = state.doc.resolve(range.from);

	for (let depth = $from.depth; depth >= 0; depth--) {
		if (disabledInNodes.includes($from.node(depth).type.name)) return true;
	}

	return false;
};

export const MarkdownSlashCommandExtension = Extension.create<MarkdownSlashCommandOptions>({
	name: 'markdownSlashCommand',

	addOptions() {
		return {
			...resolveMarkdownSlashCommandConfig(),
			render: undefined,
		};
	},

	addProseMirrorPlugins() {
		const config = resolveMarkdownSlashCommandConfig(this.options);
		return [
			Suggestion<MarkdownSlashCommand, MarkdownSlashCommand>({
				editor: this.editor,
				pluginKey: slashCommandPluginKey,
				char: '/',
				allowedPrefixes: null,
				items: ({ query }) => filterMarkdownSlashCommands(config.commands, query),
				allow: ({ state, range }) =>
					!isSelectionInsideDisabledNode(state, range, config.disabledInNodes),
				command: ({ editor, range, props }) => props.command({ editor, range }),
				render: this.options.render,
			}),
		];
	},
});
