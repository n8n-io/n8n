import type { Editor } from '@tiptap/core';
import type { Range } from '@tiptap/core';

import type { IconName } from '../../../N8nIcon';

export type MarkdownSlashCommandContext = {
	editor: Editor;
	range?: Range;
};

export type MarkdownSlashCommand = {
	id: string;
	label: string;
	icon?: IconName;
	aliases?: string[];
	command: (context: MarkdownSlashCommandContext) => void;
};

export type MarkdownSlashCommandConfig = {
	commands?: MarkdownSlashCommand[];
	additionalCommands?: MarkdownSlashCommand[];
	disabledInNodes?: string[];
};
