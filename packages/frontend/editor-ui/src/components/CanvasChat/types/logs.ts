export interface LogEntryIdentity {
	node: string;
	runIndex: number;
}

export const LOGS_PANEL_STATE = {
	CLOSED: 'closed',
	ATTACHED: 'attached',
	FLOATING: 'floating',
} as const;

export type LogsPanelState = (typeof LOGS_PANEL_STATE)[keyof typeof LOGS_PANEL_STATE];

export function isSameLogEntry(one: LogEntryIdentity, another: LogEntryIdentity): boolean {
	return one.node === another.node && one.runIndex === another.runIndex;
}
