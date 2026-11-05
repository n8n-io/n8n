import type { HooksApiV1 } from './v1';

export type * from './v1';

/**
 * Every API version that the running n8n supports. n8n can offer more than one
 * version at the same time, so an extension can pick the newest version it knows.
 *
 * This package is additive only: do not change or remove a released version.
 * Add a new version instead.
 */
export interface HooksApi {
	v1?: HooksApiV1;
}

/** The `register` export of a hook file. n8n calls it once when the instance is ready. */
export type RegisterHooks = (api: HooksApi) => Promise<void>;
