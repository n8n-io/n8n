import { GLOBAL_ADMIN_SCOPES, GLOBAL_OWNER_SCOPES } from '@/roles/scopes/global-scopes.ee';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/roles/scopes/project-scopes.ee';

describe('nodeTypePolicy:manage default grants', () => {
	it('is granted to instance owners and admins', () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('nodeTypePolicy:manage');
		expect(GLOBAL_ADMIN_SCOPES).toContain('nodeTypePolicy:manage');
	});

	it('is granted to project admins, per IAM-1142 (project admins self-govern their own row)', () => {
		expect(REGULAR_PROJECT_ADMIN_SCOPES).toContain('nodeTypePolicy:manage');
	});

	it('is not granted to personal project owners, editors, or viewers', () => {
		expect(PERSONAL_PROJECT_OWNER_SCOPES).not.toContain('nodeTypePolicy:manage');
		expect(PROJECT_EDITOR_SCOPES).not.toContain('nodeTypePolicy:manage');
		expect(PROJECT_VIEWER_SCOPES).not.toContain('nodeTypePolicy:manage');
	});
});
