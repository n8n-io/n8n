export interface ObservationCursor {
	observationScopeId: string;
	lastObservedMessageId: string;
	lastObservedAt: Date;
	updatedAt: Date;
}
