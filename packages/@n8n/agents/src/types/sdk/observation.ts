export interface ObservationCursor {
	observationScopeId: string;
	lastObservedMessageId: string;
	lastObservedAt: Date;
	updatedAt: Date;
	/**
	 * The plan and the commands of the current task, as the Observer last wrote
	 * them. Each write replaces the one before. The Reflector does not change it.
	 * Stores that do not keep it return `undefined`.
	 */
	workingSet?: string | null;
}
