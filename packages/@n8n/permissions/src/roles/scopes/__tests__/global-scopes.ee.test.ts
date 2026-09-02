import { GLOBAL_ADMIN_SCOPES, GLOBAL_OWNER_SCOPES } from '@/roles/scopes/global-scopes.ee';

describe('global-scopes.ee', () => {
	// The entire value of the instance-admin execution-quota addendum is this
	// grant: without it, `userHasScopes()` never lets a global owner/admin
	// call the per-project execution-quota endpoints against a project they
	// don't otherwise administer. See spec addendum "Instance Admin:
	// Cross-Project View".
	it('grants project:manageExecutionQuota to global owners and admins', () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('project:manageExecutionQuota');
		expect(GLOBAL_ADMIN_SCOPES).toContain('project:manageExecutionQuota');
	});
});
