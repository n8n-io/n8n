import type { CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
import type { ComputedRef, Ref } from 'vue';

export type { CommandBarItem };

export interface CommandBarEventHandlers {
	onCommandBarChange?: (query: string) => void;
	onCommandBarNavigateTo?: (to: string | null) => void;
}

export interface CommandGroup {
	commands: ComputedRef<CommandBarItem[]>;
	handlers?: CommandBarEventHandlers;
	isLoading?: Ref<boolean>;
	initialize?: () => Promise<void>;
}
