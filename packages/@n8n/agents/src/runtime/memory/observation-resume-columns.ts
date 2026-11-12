import type { ObservationResumeState } from '../../types/sdk/observation';

/** Flat columns a database store keeps next to the observation cursor. */
export interface ObservationResumeColumns {
	resumeFromMessageId: string | null;
	resumeFromAt: Date | null;
	resumeNotes: string | null;
	lastRequestTokens: number | null;
	lastModelId: string | null;
}

export function toObservationResumeColumns(
	state: ObservationResumeState,
): ObservationResumeColumns {
	return {
		resumeFromMessageId: state.resumeFrom?.lastObservedMessageId ?? null,
		resumeFromAt: state.resumeFrom?.lastObservedAt ?? null,
		resumeNotes: state.resumeNotes,
		lastRequestTokens: state.lastRequestTokens,
		lastModelId: state.lastModelId,
	};
}

export function fromObservationResumeColumns(
	observationScopeId: string,
	columns: ObservationResumeColumns,
): ObservationResumeState {
	const { resumeFromMessageId, resumeFromAt } = columns;
	return {
		observationScopeId,
		resumeFrom:
			resumeFromMessageId && resumeFromAt
				? { lastObservedMessageId: resumeFromMessageId, lastObservedAt: resumeFromAt }
				: null,
		resumeNotes: columns.resumeNotes,
		// Postgres can return int columns as strings through some drivers.
		lastRequestTokens:
			columns.lastRequestTokens === null ? null : Number(columns.lastRequestTokens),
		lastModelId: columns.lastModelId,
	};
}
