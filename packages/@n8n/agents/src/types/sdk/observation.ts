import type { ObservationLogScopeKind } from './observation-log';

export type ScopeKind = ObservationLogScopeKind;

export interface ObservationCursor {
	scopeKind: ObservationLogScopeKind;
	scopeId: string;
	lastObservedMessageId: string;
	lastObservedAt: Date;
	updatedAt: Date;
}
