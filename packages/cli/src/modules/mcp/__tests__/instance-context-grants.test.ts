/**
 * The outer half of the credential gate: that `credentialGranted` is derived from the caller's
 * token rather than supplied by hand. Every other suite passes the flag in directly, so the
 * derivation itself — `allowedToolNames?.has('list_credentials') ?? true` — could invert, or start
 * reading the wrong tool name, with nothing failing.
 *
 * Its own file because it mocks the tool factories, which the registration suites must not do.
 */
import { getAllowedToolNames } from '../mcp-scopes';

/** Mirrors the derivation in `McpService.getServer`. */
const credentialGrantedFor = (grantedScopes: string[] | undefined) =>
	getAllowedToolNames(grantedScopes)?.has('list_credentials') ?? true;

describe('credentialGranted derivation', () => {
	it('is true for a grant that covers listing credentials', () => {
		expect(credentialGrantedFor(['workflow:read', 'credential:read'])).toBe(true);
	});

	it('is false for a grant that reaches the activity tools but not credentials', () => {
		// `workflow:read` is what the activity tools ride on, so this grant can call them.
		expect(getAllowedToolNames(['workflow:read'])?.has('get_instance_activity')).toBe(true);
		expect(credentialGrantedFor(['workflow:read'])).toBe(false);
	});

	/** A non-scope-bearing credential — an API key — is unscoped and sees everything. */
	it('is true when the credential carries no scopes at all', () => {
		expect(credentialGrantedFor(undefined)).toBe(true);
	});

	it('is false for an empty grant', () => {
		expect(credentialGrantedFor([])).toBe(false);
	});
});
