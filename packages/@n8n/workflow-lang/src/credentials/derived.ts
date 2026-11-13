/**
 * Values that a credential type derives from its fields, for the library
 * nodes. Credential templates (spec section 7) read a field as it is, with no
 * default and no condition. When the v1 node builds a value from several
 * fields, the credentials file holds the result in `data.n8nDerived`, and a
 * library node reads it with `{{$credentials.n8nDerived.<name>}}`.
 *
 * Derived values come from fields that are not secret (URLs and account
 * names). They never hold a token or a key.
 */

export const DERIVED_KEY = 'n8nDerived';

type Derive = (data: Record<string, unknown>) => Record<string, string>;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The Microsoft Graph URL of the mailbox, as `microsoftApiRequest` of the Outlook v2 node builds it. */
const outlook: Derive = (data) => {
	const configured = text(data.graphApiBaseUrl);
	let base = configured !== '' ? configured : 'https://graph.microsoft.com';
	while (base.endsWith('/')) base = base.slice(0, -1);
	const shared = data.useShared === true && text(data.userPrincipalName) !== '';
	const mailbox = shared ? `users/${text(data.userPrincipalName)}` : 'me';
	return { outlookApiUrl: `${base}/v1.0/${mailbox}` };
};

const RULES: Record<string, Derive> = {
	microsoftOutlookOAuth2Api: outlook,
};

/** The derived values of a credential, or undefined when its type has none. */
export function derivedValues(
	type: string,
	data: Record<string, unknown>,
): Record<string, string> | undefined {
	return RULES[type]?.(data);
}

/** The data with its derived values under `n8nDerived`. */
export function withDerivedValues(
	type: string,
	data: Record<string, unknown>,
): Record<string, unknown> {
	const derived = derivedValues(type, data);
	return derived ? { ...data, [DERIVED_KEY]: derived } : data;
}
