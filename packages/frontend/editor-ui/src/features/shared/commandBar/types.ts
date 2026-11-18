import type { CommandBarItem } from '@n8n/design-system';
import type { ComputedRef } from 'vue';

export type { CommandBarItem };

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
	/** Search placeholder when the command bar opens with this source only */
	placeholder?: string;
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
