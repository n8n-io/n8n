import { z } from 'zod';

import { Config, Env } from '../decorators';

/**
 * The scopes an operator may take away from the personal space role in
 * canvas-only mode. Every other scope of that role stays fixed.
 */
export const CANVAS_ONLY_PERSONAL_SPACE_DENIABLE_SCOPES = [
	'credential:create',
	'dataTable:create',
	'agent:create',
] as const;

export type CanvasOnlyPersonalSpaceDeniableScope =
	(typeof CANVAS_ONLY_PERSONAL_SPACE_DENIABLE_SCOPES)[number];

const deniableScopeSchema = z.enum(CANVAS_ONLY_PERSONAL_SPACE_DENIABLE_SCOPES);

/**
 * Parses the comma-separated deny list. One entry outside the deniable scopes
 * rejects the whole value, so the `Env` decorator warns and keeps the default.
 */
const personalSpaceScopeDenyListSchema = z
	.string()
	.transform((raw) =>
		[...new Set(raw.split(',').map((entry) => entry.trim()))].filter((entry) => entry.length > 0),
	)
	.pipe(z.array(deniableScopeSchema));

@Config
export class CanvasOnlyConfig {
	/** Whether to enable canvas-only mode, hiding the chrome UI. */
	@Env('N8N_CANVAS_ONLY')
	enabled: boolean = false;

	/**
	 * Comma-separated scopes to remove from the personal space role, which every
	 * user holds in their own personal project. Only `credential:create`,
	 * `dataTable:create` and `agent:create` are accepted. Has no effect unless
	 * `N8N_CANVAS_ONLY` is `true`. Applied by the role sync on every start.
	 *
	 * @example `N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST=credential:create,agent:create`
	 */
	@Env('N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST', personalSpaceScopeDenyListSchema)
	personalSpaceScopeDenyList: CanvasOnlyPersonalSpaceDeniableScope[] = [];
}
