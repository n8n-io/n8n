import { PROJECT_CUSTOM_ROLE_OPERATIONS } from '@/roles/custom-role-scopes.ee';
import { GLOBAL_ADMIN_SCOPES, GLOBAL_OWNER_SCOPES } from '@/roles/scopes/global-scopes.ee';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/roles/scopes/project-scopes.ee';

describe('credential:createEndUser default grants', () => {
	it('is granted to instance owners and admins', () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('credential:createEndUser');
		expect(GLOBAL_ADMIN_SCOPES).toContain('credential:createEndUser');
	});

	it('is granted to project admins and personal project owners', () => {
		expect(REGULAR_PROJECT_ADMIN_SCOPES).toContain('credential:createEndUser');
		expect(PERSONAL_PROJECT_OWNER_SCOPES).toContain('credential:createEndUser');
	});

	it('is not granted to project editors or viewers', () => {
		expect(PROJECT_EDITOR_SCOPES).not.toContain('credential:createEndUser');
		expect(PROJECT_VIEWER_SCOPES).not.toContain('credential:createEndUser');
	});

	it('is selectable in custom project roles', () => {
		expect(PROJECT_CUSTOM_ROLE_OPERATIONS.credential).toContain('createEndUser');
	});
});
