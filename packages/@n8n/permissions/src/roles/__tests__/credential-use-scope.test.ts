import { PROJECT_CUSTOM_ROLE_OPERATIONS } from '@/roles/custom-role-scopes.ee';
import {
	CREDENTIALS_SHARING_OWNER_SCOPES,
	CREDENTIALS_SHARING_USER_SCOPES,
} from '@/roles/scopes/credential-sharing-scopes.ee';
import { GLOBAL_ADMIN_SCOPES, GLOBAL_OWNER_SCOPES } from '@/roles/scopes/global-scopes.ee';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/roles/scopes/project-scopes.ee';
import { combineScopes } from '@/utilities/combine-scopes.ee';

const PROJECT_ROLES_THAT_EXECUTE = {
	'project:admin': REGULAR_PROJECT_ADMIN_SCOPES,
	'project:editor': PROJECT_EDITOR_SCOPES,
	'project:personalOwner': PERSONAL_PROJECT_OWNER_SCOPES,
};

describe('credential:use default grants', () => {
	it('is granted to instance owners and admins', () => {
		expect(GLOBAL_OWNER_SCOPES).toContain('credential:use');
		expect(GLOBAL_ADMIN_SCOPES).toContain('credential:use');
	});

	it.each(Object.entries(PROJECT_ROLES_THAT_EXECUTE))(
		'is granted to %s, which can execute workflows',
		(_role, scopes) => {
			expect(scopes).toContain('credential:use');
		},
	);

	it('is not granted to project viewers, which cannot execute workflows', () => {
		expect(PROJECT_VIEWER_SCOPES).not.toContain('credential:use');
	});

	it('is selectable in custom project roles', () => {
		expect(PROJECT_CUSTOM_ROLE_OPERATIONS.credential).toContain('use');
	});

	it('is carried by both pre-existing credential roles, so no grant loses access', () => {
		expect(CREDENTIALS_SHARING_OWNER_SCOPES).toContain('credential:use');
		expect(CREDENTIALS_SHARING_USER_SCOPES).toContain('credential:use');
	});

	// The effective scope is the intersection of the project role and the
	// credential role, so a right absent from either side is gone.
	it.each(Object.entries(PROJECT_ROLES_THAT_EXECUTE))(
		'survives the intersection for %s on every pre-existing grant',
		(_role, projectScopes) => {
			for (const sharing of [CREDENTIALS_SHARING_OWNER_SCOPES, CREDENTIALS_SHARING_USER_SCOPES]) {
				const effective = combineScopes({ global: [], project: [...projectScopes] }, { sharing });
				expect(effective.has('credential:use')).toBe(true);
			}
		},
	);
});
