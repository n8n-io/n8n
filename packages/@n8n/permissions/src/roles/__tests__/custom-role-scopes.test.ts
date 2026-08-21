import {
	CUSTOM_ROLE_SCOPE_WHITELIST,
	GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS,
	GLOBAL_CUSTOM_ROLE_SCOPES,
	PROJECT_CUSTOM_ROLE_SCOPES,
} from '@/roles/custom-role-scopes.ee';
import { ALL_SCOPES } from '@/scope-information';

describe('custom role scope whitelists', () => {
	const allScopes = new Set<string>(ALL_SCOPES);

	it('project and global whitelists are strict subsets of ALL_SCOPES', () => {
		for (const scope of PROJECT_CUSTOM_ROLE_SCOPES) {
			expect(allScopes.has(scope)).toBe(true);
		}
		for (const scope of GLOBAL_CUSTOM_ROLE_SCOPES) {
			expect(allScopes.has(scope)).toBe(true);
		}

		expect(PROJECT_CUSTOM_ROLE_SCOPES.size).toBeLessThan(allScopes.size);
		expect(GLOBAL_CUSTOM_ROLE_SCOPES.size).toBeLessThan(allScopes.size);
	});

	it('scopes are partitioned by role type', () => {
		expect(PROJECT_CUSTOM_ROLE_SCOPES.has('workflow:create')).toBe(true);
		expect(GLOBAL_CUSTOM_ROLE_SCOPES.has('workflow:create')).toBe(false);

		expect(GLOBAL_CUSTOM_ROLE_SCOPES.has('user:create')).toBe(true);
		expect(PROJECT_CUSTOM_ROLE_SCOPES.has('user:create')).toBe(false);
	});

	it('includes coupled hidden scopes in the project whitelist', () => {
		expect(PROJECT_CUSTOM_ROLE_SCOPES.has('workflow:unpublish')).toBe(true);
	});

	it('includes the list scopes the editor auto-adds alongside :read', () => {
		// ProjectRoleView.toggleScope appends these when a :read scope is selected,
		// so the whitelist must accept them even though they are not shown as checkboxes.
		expect(PROJECT_CUSTOM_ROLE_SCOPES.has('workflow:list')).toBe(true);
		expect(PROJECT_CUSTOM_ROLE_SCOPES.has('credential:list')).toBe(true);
		expect(PROJECT_CUSTOM_ROLE_SCOPES.has('dataTable:listProject')).toBe(true);
	});

	it('exposes whitelists keyed by role type', () => {
		expect(CUSTOM_ROLE_SCOPE_WHITELIST.project).toBe(PROJECT_CUSTOM_ROLE_SCOPES);
		expect(CUSTOM_ROLE_SCOPE_WHITELIST.global).toBe(GLOBAL_CUSTOM_ROLE_SCOPES);
	});

	it('includes Chat scopes in the settings.Manage bundle', () => {
		const bundle = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings.Manage;

		expect(bundle).toContain('chatHub:manage');
		expect(bundle).toContain('chatHub:message');
	});

	it('exposes AI Assistant and n8n Agent scopes as their own use/manage options', () => {
		const { 'AiAssistant use': use, 'AiAssistant manage': manage } =
			GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings;

		expect(use).toContain('instanceAi:message');
		expect(manage).toContain('aiAssistant:manage');
		expect(manage).toContain('instanceAi:manage');
		expect(manage).toContain('instanceAi:message');
	});

	it('exposes instance-level MCP scopes as their own use/manage options', () => {
		const { 'Mcp use': use, 'Mcp manage': manage } = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings;

		expect(use).toContain('mcp:oauth');
		expect(use).toContain('mcpApiKey:create');
		expect(use).toContain('mcpApiKey:rotate');
		expect(manage).toContain('mcp:manage');
		expect(manage).toContain('mcp:oauth');
		expect(manage).toContain('mcpApiKey:create');
		expect(manage).toContain('mcpApiKey:rotate');
	});

	it('includes MCP and AI Assistant scopes in the general settings.Manage bundle, as a superset of their own options', () => {
		const bundle = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings.Manage;

		for (const scope of [
			'mcp:manage',
			'mcp:oauth',
			'mcpApiKey:create',
			'mcpApiKey:rotate',
			'aiAssistant:manage',
			'instanceAi:manage',
			'instanceAi:message',
		]) {
			expect(bundle).toContain(scope);
		}
	});
});
