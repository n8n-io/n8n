import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import type { IconName } from '@n8n/design-system';

export type SlashItem = {
	id: string;
	label: string;
	icon: IconName;
	run: (editor: Editor) => unknown;
};

export type SlashMenuState = {
	items: SlashItem[];
	selected: number;
	rect: DOMRect | null;
	select: (item: SlashItem) => void;
};

type SlashCommandsOptions = {
	items: () => SlashItem[];
	/** Called with the menu state on every change, and with null when the menu closes. */
	onChange: (state: SlashMenuState | null) => void;
};

export const SlashCommands = Extension.create<SlashCommandsOptions>({
	name: 'slashCommands',

	addOptions() {
		return { items: () => [], onChange: () => {} };
	},

	addProseMirrorPlugins() {
		const { items, onChange } = this.options;

		return [
			Suggestion<SlashItem, SlashItem>({
				editor: this.editor,
				pluginKey: new PluginKey('docPageSlashCommands'),
				char: '/',
				items: ({ query }) =>
					items().filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
				command: ({ editor, range, props: item }) => {
					editor.chain().focus().deleteRange(range).run();
					void item.run(editor);
				},
				render: () => {
					let state: SlashMenuState | null = null;

					const show = (props: {
						items: SlashItem[];
						clientRect?: (() => DOMRect | null) | null;
						command: (item: SlashItem) => void;
					}) => {
						state = {
							items: props.items,
							selected: 0,
							rect: props.clientRect?.() ?? null,
							select: props.command,
						};
						onChange(state);
					};

					return {
						onStart: show,
						onUpdate: show,
						onKeyDown: ({ event }) => {
							if (!state || state.items.length === 0) return false;
							const count = state.items.length;
							if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
								const step = event.key === 'ArrowDown' ? 1 : -1;
								state = { ...state, selected: (state.selected + step + count) % count };
								onChange(state);
								return true;
							}
							if (event.key === 'Enter') {
								state.select(state.items[state.selected]);
								return true;
							}
							return false;
						},
						onExit: () => {
							state = null;
							onChange(null);
						},
					};
				},
			}),
		];
	},
});
