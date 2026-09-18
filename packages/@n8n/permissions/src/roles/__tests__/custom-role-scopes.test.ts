import {
	CUSTOM_ROLE_SCOPE_WHITELIST,
	GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS,
	GLOBAL_CUSTOM_ROLE_SCOPES,
	PROJECT_CUSTOM_ROLE_SCOPES,
} from '@/roles/custom-role-scopes.ee';
import { GLOBAL_MEMBER_SCOPES } from '@/roles/scopes/global-scopes.ee';
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

	it('exposes n8n Assistant and n8n Agent scopes as their own use/manage options', () => {
		const { 'AiAssistant use': use, 'AiAssistant manage': manage } =
			GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings;

		expect(use).toContain('instanceAi:message');
		expect(use).toContain('instanceAi:gateway');
		expect(manage).toContain('aiAssistant:manage');
		expect(manage).toContain('instanceAi:manage');
		expect(manage).toContain('instanceAi:message');
		expect(manage).toContain('instanceAi:gateway');
	});

	it('"AiAssistant use" matches GLOBAL_MEMBER_SCOPES\' instanceAi:* grants exactly', () => {
		// Member's baseline n8n Assistant access is `instanceAi:message` +
		// `instanceAi:gateway` (computer-use gateway pairing). A custom role built
		// to mirror Member must get both, or it ends up strictly weaker than Member.
		const use = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings['AiAssistant use'];
		const memberInstanceAiScopes = GLOBAL_MEMBER_SCOPES.filter((s) => s.startsWith('instanceAi:'));
		expect(new Set(use)).toEqual(new Set(memberInstanceAiScopes));
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

	it('includes MCP and n8n Assistant scopes in the general settings.Manage bundle, as a superset of their own options', () => {
		const bundle = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings.Manage;

		for (const scope of [
			'mcp:manage',
			'mcp:oauth',
			'mcpApiKey:create',
			'mcpApiKey:rotate',
			'aiAssistant:manage',
			'instanceAi:manage',
			'instanceAi:message',
			'instanceAi:gateway',
		]) {
			expect(bundle).toContain(scope);
		}
	});

	it('exposes "Tags: View" as exactly the tag read/list pair', () => {
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.tag.View).toEqual(['tag:read', 'tag:list']);
	});

	it('keeps tag "Manage" a strict superset of tag "View"', () => {
		// The editor's implied/downgrade arithmetic (SUPERSEDED_BY: View -> Manage)
		// only holds while Manage contains everything View grants.
		const view = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.tag.View;
		const manage = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.tag.Manage;
		expect(view.every((scope) => (manage as readonly string[]).includes(scope))).toBe(true);
		expect(manage.length).toBeGreaterThan(view.length);
	});

	it('exposes "Variables: View" as exactly the global variable list/read pair', () => {
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.variable.View).toEqual([
			'variable:list',
			'variable:read',
		]);
	});

	it('keeps "Variables: View" within GLOBAL_MEMBER_SCOPES', () => {
		// A custom role built to mirror Member must never end up with more than Member.
		for (const scope of GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.variable.View) {
			expect(GLOBAL_MEMBER_SCOPES).toContain(scope);
		}
	});

	it('keeps variable "Manage" a strict superset of variable "View"', () => {
		// The editor's implied/downgrade arithmetic (SUPERSEDED_BY: View -> Manage)
		// only holds while Manage contains everything View grants.
		const view = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.variable.View;
		const manage = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.variable.Manage;
		expect(view.every((scope) => (manage as readonly string[]).includes(scope))).toBe(true);
		expect(manage.length).toBeGreaterThan(view.length);
	});

	it('keeps variable scopes out of the settings.Manage bundle', () => {
		// Global variables have their own group, so granting instance Settings no
		// longer grants them. Every scope must live under exactly one group.
		const bundle = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings.Manage as readonly string[];
		expect(bundle).not.toContain('variable:list');
		expect(bundle).not.toContain('variable:read');
	});

	it('keeps "Tags: View" within GLOBAL_MEMBER_SCOPES', () => {
		// "Tags: View" is granted to every instance role by default (see
		// instanceRoleScopes.ts), so it must never exceed what the built-in Member
		// role already has.
		for (const scope of GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.tag.View) {
			expect(GLOBAL_MEMBER_SCOPES).toContain(scope);
		}
	});

	it('exposes "Users: View" as exactly user:list, matching GLOBAL_MEMBER_SCOPES', () => {
		// "Users: View" is granted to every instance role by default (see
		// instanceRoleScopes.ts). It must never exceed what the built-in Member
		// role already has, or a custom role mirroring Member ends up more
		// privileged than Member itself
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.View).toEqual(['user:list']);
		for (const scope of GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.View) {
			expect(GLOBAL_MEMBER_SCOPES).toContain(scope);
		}
	});
});
