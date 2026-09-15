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
 */
describe('aiPreference scope', () => {
	it('offers the read operation the MCP tool gates on', () => {
		expect(RESOURCES.aiPreference).toContain('read');
	});

	it('is granted to the roles that build', () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('aiPreference:read');
		expect(GLOBAL_ADMIN_SCOPES).toContain('aiPreference:read');
		expect(GLOBAL_MEMBER_SCOPES).toContain('aiPreference:read');
	});

	it('is withheld from the chat-user role, which does not build', () => {
		expect(GLOBAL_CHAT_USER_SCOPES).not.toContain('aiPreference:read');
	});

	it('is described, so the custom-role picker can label it', () => {
		expect(scopeInformation['aiPreference:read']).toEqual({
			displayName: expect.any(String),
			description: expect.any(String),
		});
	});
});
