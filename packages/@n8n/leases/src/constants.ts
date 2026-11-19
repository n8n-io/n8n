import type { LeaseKindOptions } from './types';

export const MAX_LEASE_KIND_LENGTH = 24;

export const DEFAULT_LEASE_KIND_OPTIONS = Object.freeze({
	startTimeoutSeconds: 60,
	maxFailedStarts: 5,
} satisfies LeaseKindOptions);
