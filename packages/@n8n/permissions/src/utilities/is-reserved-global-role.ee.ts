import { RESERVED_GLOBAL_ROLE_SLUGS } from '../constants.ee';

/** True for a global role that only n8n sets. See `RESERVED_GLOBAL_ROLE_SLUGS`. */
export const isReservedGlobalRole = (slug: string): boolean =>
	(RESERVED_GLOBAL_ROLE_SLUGS as readonly string[]).includes(slug);
