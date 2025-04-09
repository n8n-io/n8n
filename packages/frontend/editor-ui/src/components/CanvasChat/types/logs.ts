import { type TreeNode } from '@/components/RunDataAi/utils';

export type LogEntrySelection =
	| { type: 'selected'; data: TreeNode }
	| { type: 'initial' }
	| { type: 'none' };

export const LOGS_PANEL_STATE = {
	CLOSED: 'closed',
	ATTACHED: 'attached',
	FLOATING: 'floating',
} as const;

export type LogsPanelState = (typeof LOGS_PANEL_STATE)[keyof typeof LOGS_PANEL_STATE];
