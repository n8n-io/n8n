import { isApiKeyScope } from '@/types.ee';
import { PROJECT_CUSTOM_ROLE_SCOPES } from '@/roles/custom-role-scopes.ee';
import { GLOBAL_ADMIN_SCOPES, GLOBAL_OWNER_SCOPES } from '@/roles/scopes/global-scopes.ee';
import {
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/roles/scopes/project-scopes.ee';
import {
	WORKFLOW_SHARING_EDITOR_SCOPES,
	WORKFLOW_SHARING_OWNER_SCOPES,
} from '@/roles/scopes/workflow-sharing-scopes.ee';

describe.each(['workflow:manageOwner', 'agent:manageOwner'] as const)('%s scope', (scope) => {
	it('is granted to instance owners and admins, project admins and personal project owners', () => {
		for (const scopes of [
			GLOBAL_OWNER_SCOPES,
			GLOBAL_ADMIN_SCOPES,
			REGULAR_PROJECT_ADMIN_SCOPES,
			PERSONAL_PROJECT_OWNER_SCOPES,
		]) {
			expect(scopes).toContain(scope);
		}
	});

	it('is withheld from editors and viewers', () => {
		for (const scopes of [
			PROJECT_EDITOR_SCOPES,
			PROJECT_VIEWER_SCOPES,
			WORKFLOW_SHARING_EDITOR_SCOPES,
		]) {
			expect(scopes).not.toContain(scope);
		}
	});

	it('can be given to a custom project role', () => {
		expect(PROJECT_CUSTOM_ROLE_SCOPES.has(scope)).toBe(true);
	});

	it('is not available to API keys', () => {
		expect(isApiKeyScope(scope)).toBe(false);
	});
});

it('applies workflow:manageOwner only through the home project of a workflow', () => {
	expect(WORKFLOW_SHARING_OWNER_SCOPES).toContain('workflow:manageOwner');
});
