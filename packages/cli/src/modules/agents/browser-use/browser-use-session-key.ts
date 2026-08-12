import { createHash } from 'node:crypto';

/**
 * Separates the two halves before hashing. `|` is outside the nanoid alphabet
 * agent ids are drawn from, so no two input pairs can collide by shifting the
 * boundary between them.
 */
const KEY_SEPARATOR = '|';

/**
 * Derives the key an agent's browser session is registered under.
 *
 * The key is handed to `InstanceAiBrowserSessionService`, which uses it both as
 * a map key and as a `tmpdir()` path segment without sanitising it. Hashing is
 * therefore load-bearing, not cosmetic: `resourceId` is attacker-influenced on
 * channel runs (`integration:slack:<their user id>`), and a raw value could
 * carry `..` or, on Windows, an illegal `:`.
 *
 * `resourceId` comes from `ctx.persistence` and is already the stable
 * per-end-user identity: `draft-chat:<n8nUserId>` in the chat preview,
 * `integration:<platform>:<platformUserId>` on a channel. It is absent for
 * inline/adhoc runs, where Browser Use has nobody to prompt, hence `null`.
 */
export function browserSessionKeyFor(agentId: string, resourceId?: string): string | null {
	if (!resourceId) return null;

	const digest = createHash('sha256')
		.update(`${agentId}${KEY_SEPARATOR}${resourceId}`)
		.digest('hex');
	return `agents-${digest.slice(0, 32)}`;
}
