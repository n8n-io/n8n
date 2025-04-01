export interface LogEntryIdentity {
	node: string;
	runIndex: number;
}

export type LogsPanelState = 'closed' | 'attached' | 'floating';
