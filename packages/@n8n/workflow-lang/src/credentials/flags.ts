/**
 * A credential flag: the outcome of one condition on the fields of a credential. The node
 * compiler writes the condition; n8n computes it where the credential is stored and puts the
 * boolean under `data.n8nDerived.<name>`. Node code reads it with `ctx.credentialFlag(slot, name)`
 * and reads no other value of the credential.
 */

/** The name of a flag. A derived text value has the prefix `d`, so the two never collide. */
export const CREDENTIAL_FLAG_NAME = /^f[0-9a-f]{8}$/;

/** The most flags that one node instance can read. */
export const MAX_CREDENTIAL_FLAGS = 16;

/** The message of the error that node code gets when the credential has no value for a flag. */
export const CREDENTIAL_FLAG_MISSING = 'The credential has no value for a condition of this node';

/** The flag of a slot in a table of flags: a boolean under a flag name, or undefined. */
export function credentialFlagIn(
	flags: Record<string, Record<string, unknown>> | undefined,
	slot: unknown,
	name: unknown,
): boolean | undefined {
	if (typeof slot !== 'string' || typeof name !== 'string' || !CREDENTIAL_FLAG_NAME.test(name))
		return undefined;
	const ofSlot = flags !== undefined && Object.hasOwn(flags, slot) ? flags[slot] : undefined;
	const value = ofSlot !== undefined && Object.hasOwn(ofSlot, name) ? ofSlot[name] : undefined;
	return typeof value === 'boolean' ? value : undefined;
}

/** The prefix of an entry of the verified list that holds flag values. */
export const CREDENTIAL_FLAGS_PREFIX = '@flags=';

/**
 * The values of the flags of one node instance as one text, for the verified list
 * (`@flags=f0123abcd:1,f4567cdef:0`). A node instance runs compiled only with values of its
 * flags that were checked against the v1 node together.
 */
export function credentialFlagKey(names: string[], values: Record<string, boolean>): string {
	return `${CREDENTIAL_FLAGS_PREFIX}${[...names]
		.sort()
		.map((name) => `${name}:${values[name] ? '1' : '0'}`)
		.join(',')}`;
}
