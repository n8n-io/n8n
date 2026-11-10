export interface ObservationCursor {
	observationScopeId: string;
	lastObservedMessageId: string;
	lastObservedAt: Date;
	updatedAt: Date;
}

/**
 * What the model was last sent for a thread. Stored next to the cursor.
 * A resume point is the cursor at the moment the model switched from full
 * history to notes. Every later request starts from it with the same notes,
 * so the cached prompt start stays stable until the next resume.
 */
export interface ObservationResumeState {
	observationScopeId: string;
	/** Messages at or before this point are replaced by `resumeNotes`. */
	resumeFrom: { lastObservedMessageId: string; lastObservedAt: Date } | null;
	/** The rendered notes as sent at the resume point. The Reflector does not change them. */
	resumeNotes: string | null;
	/** Input tokens the provider reported for the last request of the thread. */
	lastRequestTokens: number | null;
	/** Model of the last request. A different model has no cached prompt to reuse. */
	lastModelId: string | null;
}

/** Optional store methods for resume state. Stores without them replay from the cursor. */
export interface BuiltObservationResumeStore {
	getResumeState(observationScopeId: string): Promise<ObservationResumeState | null>;
	/** Saves the state on the existing cursor row. Does nothing when the thread has no cursor. */
	saveResumeState(state: ObservationResumeState): Promise<void>;
}
