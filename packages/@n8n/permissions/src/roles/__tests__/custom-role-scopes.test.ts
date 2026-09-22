import { API_KEY_RESOURCES } from '@/constants.ee';
import {
	CUSTOM_ROLE_SCOPE_WHITELIST,
	GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS,
	GLOBAL_CUSTOM_ROLE_SCOPES,
	isMandatoryInstanceOption,
	BASELINE_INSTANCE_SCOPES,
	MANDATORY_INSTANCE_SCOPES,
	PROJECT_CUSTOM_ROLE_SCOPES,
	withMandatoryInstanceScopes,
} from '@/roles/custom-role-scopes.ee';
import {
	CREDENTIALS_SHARING_OWNER_SCOPES,
	CREDENTIALS_SHARING_USER_SCOPES,
} from '@/roles/scopes/credential-sharing-scopes.ee';
import {
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	GLOBAL_OWNER_SCOPES,
} from '@/roles/scopes/global-scopes.ee';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_CHAT_USER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/roles/scopes/project-scopes.ee';
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

	it('keeps chatHub:manage in the settings.Manage bundle and chatHub:message in the baseline', () => {
		const bundle = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings.Manage as readonly string[];

		expect(bundle).toContain('chatHub:manage');
		// Every role can message Chat, so the scope is baseline rather than part of Manage.
		expect(bundle).not.toContain('chatHub:message');
		expect(BASELINE_INSTANCE_SCOPES).toContain('chatHub:message');
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
		// MANDATORY_INSTANCE_OPTIONS), so it must never exceed what the built-in
		// Member role already has.
		for (const scope of GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.tag.View) {
			expect(GLOBAL_MEMBER_SCOPES).toContain(scope);
		}
	});

	it('exposes "Credentials: View" as exactly the credential list/read pair', () => {
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.credential.View).toEqual([
			'credential:list',
			'credential:read',
		]);
	});

	it('keeps credential "Use" a strict superset of credential "View"', () => {
		// The editor's implied/downgrade arithmetic (SUPERSEDED_BY:
		// View -> Use -> Manage) only holds while each rung contains everything the
		// rung below grants.
		const view = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.credential.View as readonly string[];
		const use = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.credential.Use as readonly string[];
		expect(view.every((scope) => use.includes(scope))).toBe(true);
		expect(use.length).toBeGreaterThan(view.length);
	});

	it('keeps credential "Manage" a strict superset of credential "Use"', () => {
		const use = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.credential.Use as readonly string[];
		const manage = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.credential.Manage as readonly string[];
		expect(use.every((scope) => manage.includes(scope))).toBe(true);
		expect(manage.length).toBeGreaterThan(use.length);
	});

	it('adds `credential:use` at the "Use" rung and nowhere below it', () => {
		// The whole point of the group: View sees credentials, Use may run them.
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.credential.View).not.toContain('credential:use');
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.credential.Use).toContain('credential:use');
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.credential.Manage).toContain('credential:use');
	});

	it('keeps the owner-only credential scopes out of every credential option', () => {
		// These stay Owner/Admin-only. `shareGlobally` reaches every user on the
		// instance, `manageInstance` is a separate lane for provider connections,
		// `createEndUser` is an owner-level *project* capability, and `connect` is
		// per-user and per-credential.
		const excluded = [
			'credential:shareGlobally',
			'credential:manageInstance',
			'credential:createEndUser',
			'credential:connect',
		];
		for (const option of Object.values<readonly string[]>(
			GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.credential,
		)) {
			for (const scope of excluded) expect(option).not.toContain(scope);
		}
		for (const scope of excluded) expect(GLOBAL_CUSTOM_ROLE_SCOPES.has(scope)).toBe(false);
	});

	it('keeps credential scopes out of the settings.Manage bundle', () => {
		// Every scope must live under exactly one group.
		const bundle = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.settings.Manage as readonly string[];
		expect(bundle).not.toContain('credential:list');
		expect(bundle).not.toContain('credential:read');
		expect(bundle).not.toContain('credential:use');
	});

	it('exposes "Users: View" as exactly user:list, matching GLOBAL_MEMBER_SCOPES', () => {
		// "Users: View" is granted to every instance role by default (see
		// MANDATORY_INSTANCE_OPTIONS). It must never exceed what the built-in
		// Member role already has, or a custom role mirroring Member ends up more
		// privileged than Member itself
		expect(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.View).toEqual(['user:list']);
		for (const scope of GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.View) {
			expect(GLOBAL_MEMBER_SCOPES).toContain(scope);
		}
	});
});

describe('mandatory instance options', () => {
	it('resolves to the user and tag view scopes plus the baseline scopes', () => {
		expect(MANDATORY_INSTANCE_SCOPES).toEqual([
			'user:list',
			'tag:read',
			'tag:list',
			...BASELINE_INSTANCE_SCOPES,
		]);
	});

	it('stays inside the global custom-role whitelist', () => {
		// resolveScopes unions these in before the whitelist check, so a mandatory
		// scope outside the whitelist would make every global-role write fail.
		for (const scope of MANDATORY_INSTANCE_SCOPES) {
			expect(GLOBAL_CUSTOM_ROLE_SCOPES.has(scope)).toBe(true);
		}
	});

	it('stays within GLOBAL_MEMBER_SCOPES', () => {
		// Added to every custom instance role, so they must never exceed what the
		// built-in Member role already grants.
		for (const scope of MANDATORY_INSTANCE_SCOPES) {
			expect(GLOBAL_MEMBER_SCOPES).toContain(scope);
		}
	});

	it('identifies mandatory options and only those', () => {
		expect(isMandatoryInstanceOption('user', 'View')).toBe(true);
		expect(isMandatoryInstanceOption('tag', 'View')).toBe(true);
		expect(isMandatoryInstanceOption('user', 'Manage')).toBe(false);
		expect(isMandatoryInstanceOption('insights', 'View')).toBe(false);
		expect(isMandatoryInstanceOption('nonsense', 'View')).toBe(false);
	});

	it('withMandatoryInstanceScopes adds the mandatory scopes to an empty list', () => {
		expect(withMandatoryInstanceScopes([])).toEqual([
			'user:list',
			'tag:read',
			'tag:list',
			...BASELINE_INSTANCE_SCOPES,
		]);
	});

	it('withMandatoryInstanceScopes does not duplicate scopes already present', () => {
		const result = withMandatoryInstanceScopes(['user:list', 'tag:read']);
		expect(result.filter((scope) => scope === 'user:list')).toHaveLength(1);
		expect(result.filter((scope) => scope === 'tag:read')).toHaveLength(1);
		expect(new Set(result).size).toBe(result.length);
	});

	it('withMandatoryInstanceScopes dedups a repeated input slug', () => {
		expect(withMandatoryInstanceScopes(['insights:read', 'insights:read'])).toEqual([
			'insights:read',
			'user:list',
			'tag:read',
			'tag:list',
			...BASELINE_INSTANCE_SCOPES,
		]);
	});

	it('withMandatoryInstanceScopes preserves unrelated scopes untouched', () => {
		const result = withMandatoryInstanceScopes(['insights:read', 'insights:list']);
		expect(result).toContain('insights:read');
		expect(result).toContain('insights:list');
		expect(result).toEqual(expect.arrayContaining([...MANDATORY_INSTANCE_SCOPES]));
	});
});

describe('baseline instance scopes', () => {
	it('lists the read scopes Member holds that have no option of their own', () => {
		expect([...BASELINE_INSTANCE_SCOPES].sort()).toEqual([
			'chatHub:message',
			'credentialResolver:list',
			'dataTable:list',
			'eventBusDestination:list',
			'eventBusDestination:test',
		]);
	});

	it('stays within GLOBAL_MEMBER_SCOPES', () => {
		// Added to every custom instance role, so they must never exceed Member.
		for (const scope of BASELINE_INSTANCE_SCOPES) {
			expect(GLOBAL_MEMBER_SCOPES).toContain(scope);
		}
	});

	it('is not part of any option bundle', () => {
		// Every role holds them, so counting them toward an option would render
		// that option half-checked for a role that holds nothing else of it.
		const optionScopes = Object.values(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS).flatMap((optionMap) =>
			Object.values<readonly string[]>(optionMap).flat(),
		);
		for (const scope of BASELINE_INSTANCE_SCOPES) {
			expect(optionScopes).not.toContain(scope);
		}
	});

	it('stays inside the global custom-role whitelist', () => {
		for (const scope of BASELINE_INSTANCE_SCOPES) {
			expect(GLOBAL_CUSTOM_ROLE_SCOPES.has(scope)).toBe(true);
		}
	});
});

describe('`credential:use` is global-only by construction', () => {
	// `credential:use` means "may use any credential on the instance in a workflow,
	// without being a member of its project". It is not a per-credential or
	// per-project right, so the enforcement split in CredentialsFinderService only
	// holds while the scope stays out of the project lane entirely: no project role,
	// no sharing mask, no project custom role, no API key. Adding it to any of them
	// would silently change what the same predicate means.
	it('is held by the static global Owner and Admin roles', () => {
		// Owner and Admin must keep today's behaviour exactly, which they do only
		// because the second conjunct of every changed predicate is true for them.
		expect(GLOBAL_OWNER_SCOPES).toContain('credential:use');
		expect(GLOBAL_ADMIN_SCOPES).toContain('credential:use');
	});

	it('is not held by the static global Member role', () => {
		expect(GLOBAL_MEMBER_SCOPES).not.toContain('credential:use');
	});

	it('is absent from every static project role', () => {
		const projectRoleScopes = {
			REGULAR_PROJECT_ADMIN_SCOPES,
			PERSONAL_PROJECT_OWNER_SCOPES,
			PROJECT_EDITOR_SCOPES,
			PROJECT_VIEWER_SCOPES,
			PROJECT_CHAT_USER_SCOPES,
		};
		for (const [name, scopes] of Object.entries(projectRoleScopes)) {
			expect(scopes, name).not.toContain('credential:use');
		}
	});

	it('is absent from both credential sharing masks', () => {
		expect(CREDENTIALS_SHARING_OWNER_SCOPES).not.toContain('credential:use');
		expect(CREDENTIALS_SHARING_USER_SCOPES).not.toContain('credential:use');
	});

	it('is absent from the project custom-role whitelist', () => {
		expect(PROJECT_CUSTOM_ROLE_SCOPES.has('credential:use')).toBe(false);
	});

	it('is present in the global custom-role whitelist', () => {
		expect(GLOBAL_CUSTOM_ROLE_SCOPES.has('credential:use')).toBe(true);
	});

	it('is not an API key scope', () => {
		// getApiKeyScopesForRole filters through isApiKeyScope, so leaving `use` out of
		// API_KEY_RESOURCES keeps every API-key scope set byte-identical.
		expect(API_KEY_RESOURCES.credential).not.toContain('use');
	});

	it('is the one credential scope the two custom-role whitelists do not share', () => {
		// The 'scopes are partitioned by role type' test above only asserts
		// workflow:create and user:create, so a credential scope living in both
		// whitelists does not fail it. Most do live in both, by design: the same right
		// can be granted per project and instance-wide. `credential:use` is the
		// exception, and the enforcement split depends on it staying so.
		const credentialScopesInBoth = [...GLOBAL_CUSTOM_ROLE_SCOPES].filter(
			(scope) => scope.startsWith('credential:') && PROJECT_CUSTOM_ROLE_SCOPES.has(scope),
		);
		expect(credentialScopesInBoth).not.toContain('credential:use');

		const globalCredentialScopes = [...GLOBAL_CUSTOM_ROLE_SCOPES].filter((scope) =>
			scope.startsWith('credential:'),
		);
		expect(
			globalCredentialScopes.filter((scope) => !PROJECT_CUSTOM_ROLE_SCOPES.has(scope)),
		).toEqual(['credential:use']);
	});
});
