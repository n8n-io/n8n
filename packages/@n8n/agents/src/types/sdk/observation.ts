export interface ObservationCursor {
	observationScopeId: string;
	lastObservedMessageId: string;
	/** The full history through this message needs no stored observations. */
	emptyLogThroughMessageId?: string | null;
	lastObservedAt: Date;
	updatedAt: Date;
}
