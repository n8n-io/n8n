import type { CommandBarItem } from '@n8n/design-system';
import type { ComputedRef } from 'vue';
import type { ThemeSelection } from '@/Interface';

export type { CommandBarItem };

/**
 * A command that sets the mode, the theme family, or both.
 * The command bar previews `theme` over the saved selection while the user highlights the item.
 * A key that is not set keeps its saved value.
 */
export interface ThemeCommandBarItem extends CommandBarItem {
	theme: Partial<ThemeSelection>;
}

export interface CommandBarSearchRequest {
	query: string;
	offset: number;
	limit: number;
}

export interface CommandBarSearchResult {
	items: CommandBarItem[];
	hasMore: boolean;
}

interface CommandBarSourceBase {
	id: string;
	title: string;
	isAvailable: () => boolean;
}

export interface CommandBarLocalSource extends CommandBarSourceBase {
	isRemote: false;
	search: (request: CommandBarSearchRequest) => CommandBarSearchResult;
}

export interface CommandBarRemoteSource extends CommandBarSourceBase {
	isRemote: true;
	search: (request: CommandBarSearchRequest) => Promise<CommandBarSearchResult>;
}

export type CommandBarSource = CommandBarLocalSource | CommandBarRemoteSource;

export interface CommandGroup {
	commands: ComputedRef<CommandBarItem[]>;
	source?: CommandBarSource;
	initialize?: () => Promise<void>;
}
