/**
 * The fields of a credential that the node compiler can read at publish time
 * (`SpecialiseInput.credentialFields`). A compiled module holds what the
 * compiler folds, and a module is not encrypted, so only fields that cannot be
 * a secret are public:
 *
 * - a choice (`options`) or a flag (`boolean`): node code branches on these
 *   (`authentication`, `useShared`, `environment`);
 * - text whose name says that it is an address or a place (`baseUrl`,
 *   `subdomain`, `region`): node code builds the request URL from these.
 *
 * A field that n8n marks as a password is never public, whatever its type. A
 * field whose name says that it is a key, a token or a secret is never public,
 * unless it is a flag: a flag holds one bit (`allowUnauthorizedCerts`,
 * `useCustomCertificate`), not the secret itself. Every other field stays a credential template: the runtime puts it into the
 * request, and node code cannot read it.
 */
import type { CredentialTypeInfo } from './types.ts';

const PLACE =
	/(url|uri|host|hostname|domain|subdomain|server|endpoint|region|environment|datacenter)$/i;
const SECRET = /(key|secret|token|password|passphrase|private|signature|certificate|cert|pass)/i;

/** The public fields of a credential: the stored value, or the default of the type. */
export function publicCredentialFields(
	info: CredentialTypeInfo | undefined,
	data: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [name, field] of Object.entries(info?.fields ?? {})) {
		// The session token of `preAuthentication` is a secret that n8n fills, whatever its name.
		if (field.password || name === info?.expirable) continue;
		const flag = field.type === 'boolean';
		if (!flag && SECRET.test(name)) continue;
		const choice = field.type === 'options' || flag;
		const place = (field.type === 'string' || field.type === 'hidden') && PLACE.test(name);
		if (!choice && !place) continue;
		const value = Object.hasOwn(data, name) ? data[name] : info?.defaults?.[name];
		if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number')
			out[name] = value;
	}
	return out;
}

/**
 * The field that n8n adds to each credential type that authenticates requests. Only the HTTP
 * Request and GraphQL nodes read it. The value `all` is the default and sets no limit, as for
 * a credential without the field, so it is not a class of its own. Another value stays a
 * class: it is not in the verified list, and the node runs in the fallback host.
 */
const NO_LIMIT: Record<string, unknown> = { allowedHttpRequestDomains: 'all' };

/** The public fields of a credential and their classes, as the node compiler takes them. */
export interface PublicCredential {
	fields: Record<string, unknown>;
	/**
	 * The class of each field, for the verified list of the node compiler: a choice or a flag by
	 * its value, an address as `set` or `empty`. Two credentials with the same classes take the
	 * same branches in node code.
	 */
	classes: string[];
}

export function publicCredential(
	info: CredentialTypeInfo | undefined,
	data: Record<string, unknown>,
): PublicCredential {
	const fields = publicCredentialFields(info, data);
	const classes = Object.keys(fields)
		.filter((name) => !(Object.hasOwn(NO_LIMIT, name) && fields[name] === NO_LIMIT[name]))
		.sort()
		.map((name) => {
			const type = info?.fields?.[name]?.type;
			const value = fields[name];
			const choice = type === 'options' || type === 'boolean';
			return `@${info?.name ?? ''}.${name}=${choice ? String(value) : value === '' ? 'empty' : 'set'}`;
		});
	return { fields, classes };
}
