import { RESOURCES } from '@/constants.ee';
import {
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_CHAT_USER_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	GLOBAL_OWNER_SCOPES,
} from '@/roles/scopes/global-scopes.ee';
import { scopeInformation } from '@/scope-information';

/**
 * `ai_preference` is a first-class resource — an entity, a repository, a service and a table —
 * so reading it is governed by a normal scope rather than by an MCP-only string. CONTEXT-132.
 *
 * The global scope covers instance rows and other users' rows. A user's own rows need no
 * scope, which is why members do not hold it: granting it would let them see every user's rows.
 */
describe('aiPreference scope', () => {
	it('offers the read operation the MCP grant maps to', () => {
		expect(RESOURCES.aiPreference).toContain('read');
	});

	// `aiPreference:write` is an OAuth consent scope, not an RBAC operation: like `workflow:write`
	// it unlocks tools, and the service then applies these three operations to the row.
	it('offers the create, update and delete operations the MCP write grant maps to', () => {
		expect(RESOURCES.aiPreference).toEqual(expect.arrayContaining(['create', 'update', 'delete']));
	});

	it("is granted to the roles that may see other users' rows", () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('aiPreference:read');
		expect(GLOBAL_ADMIN_SCOPES).toContain('aiPreference:read');
	});

	it('is withheld from members and chat users, whose own rows need no scope', () => {
		expect(GLOBAL_MEMBER_SCOPES).not.toContain('aiPreference:read');
		expect(GLOBAL_CHAT_USER_SCOPES).not.toContain('aiPreference:read');
	});

	it('is described, so the custom-role picker can label it', () => {
		expect(scopeInformation['aiPreference:read']).toEqual({
			displayName: expect.any(String),
			description: expect.any(String),
		});
	});
});
