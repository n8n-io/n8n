import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { Suggestion } from '@tiptap/suggestion';

import { createMentionMenuRenderer } from './mentionMenuRenderer';
import { ResourceChipNode } from './resourceChipNode';
import { insertResourceChip } from './resourceLinkInsertion';
import { DEFAULT_SLASH_COMMANDS, filterSlashCommands, type SlashCommand } from './slashCommands';
import SlashMenu from './SlashMenu.vue';
import { createSuggestionMenuRenderer } from './suggestionMenuRenderer';
import { RESOURCE_SEARCH_DEBOUNCE_MS } from '../page.constants';
import type { ResourceSearchResult } from '../resources/resource.api';

export type PageEditorExtensionOptions = {
	/** Searches the resources that the `@` menu offers. */
	searchResources: (query: string) => Promise<ResourceSearchResult[]>;
	/** The commands that the `/` menu offers, in menu order. Defaults to `DEFAULT_SLASH_COMMANDS`. */
	slashCommands?: SlashCommand[];
};

const MENTION_PLUGIN_KEY = new PluginKey('pageResourceMention');
const SLASH_PLUGIN_KEY = new PluginKey('pageSlashCommand');

/**
 * Builds the editor extensions of a page.
 * A link to an n8n resource renders as a chip, and `@` opens a menu that inserts such a link.
 * `/` at the start of a block or after a space opens a menu of block commands.
 */
export function createPageEditorExtensions({
	searchResources,
	slashCommands = DEFAULT_SLASH_COMMANDS,
}: PageEditorExtensionOptions): Extension[] {
	return [
		Extension.create({
			name: 'pageResourceLinks',

			addExtensions() {
				return [ResourceChipNode];
			},

			addProseMirrorPlugins() {
				return [
					Suggestion<ResourceSearchResult, ResourceSearchResult>({
						editor: this.editor,
						pluginKey: MENTION_PLUGIN_KEY,
						char: '@',
						debounce: RESOURCE_SEARCH_DEBOUNCE_MS,
						items: async ({ query }) => await searchResources(query),
						command: ({ editor, range, props: resource }) =>
							insertResourceChip(editor, resource.path, resource.name, range),
						render: createMentionMenuRenderer,
					}),
				];
			},
		}),
		Extension.create({
			name: 'pageSlashCommands',

			addProseMirrorPlugins() {
				return [
					Suggestion<SlashCommand, SlashCommand>({
						editor: this.editor,
						pluginKey: SLASH_PLUGIN_KEY,
						char: '/',
						allow: ({ editor }) => !editor.isActive('codeBlock'),
						items: ({ query }) => filterSlashCommands(slashCommands, query),
						command: ({ editor, range, props: command }) => {
							void command.run({ editor, range });
						},
						render: createSuggestionMenuRenderer<SlashCommand>(SlashMenu),
					}),
				];
			},
		}),
	];
}
