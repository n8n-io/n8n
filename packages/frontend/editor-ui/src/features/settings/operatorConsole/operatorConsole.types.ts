import type { OperatorLogRecord } from '@n8n/api-types';

/**
 * Non-log rows the console renders inline with the stream. Every one of them
 * exists to make a loss of fidelity visible — dropping them would let the pane
 * imply a continuity it does not have.
 */
export type OperatorConsoleMarkerKind =
	/** Producer-side rate cap discarded lines at this point in the stream. */
	| 'dropped'
	/** The requested cursor had already been evicted server-side. */
	| 'gap'
	/** The client buffer overflowed and evicted its oldest entries. */
	| 'trimmed'
	/** Start of file-sourced history: structured logs only, no tee'd stdout/stderr. */
	| 'historyStart'
	/** End of file-sourced history, start of the live stream. */
	| 'historyEnd';

export type OperatorConsoleRecordEntry = {
	kind: 'record';
	/** Stable, client-assigned. Used as the virtual scroller key. */
	id: string;
	record: OperatorLogRecord;
};

export type OperatorConsoleMarkerEntry = {
	kind: 'marker';
	id: string;
	marker: OperatorConsoleMarkerKind;
	/** Line count for `dropped` / `trimmed`. */
	count?: number;
	/** Producing host for `dropped`. */
	hostId?: string;
};

export type OperatorConsoleEntry = OperatorConsoleRecordEntry | OperatorConsoleMarkerEntry;

export type OperatorConsoleConnectionState = 'idle' | 'connecting' | 'streaming' | 'error';
