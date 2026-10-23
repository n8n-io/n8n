import { PROJECT_SCOPE_MAP } from '@n8n/permissions';

import {
	PERSONAL_SPACE_GROUPS,
	PERSONAL_SPACE_GROUP_LABEL_KEYS,
	PERSONAL_SPACE_RESOURCES,
	PERSONAL_SPACE_RESOURCE_LABEL_KEYS,
	PERSONAL_SPACE_ROW_SCOPES,
	PERSONAL_SPACE_TOOLTIP_KEYS,
} from './personalSpacePermissions';

describe('personalSpacePermissions', () => {
	it('lists view and manage over the six resources of the design, in that order', () => {
		expect(PERSONAL_SPACE_GROUPS).toEqual(['view', 'manage']);
		expect(PERSONAL_SPACE_RESOURCES).toEqual([
			'workflow',
			'credential',
			'dataTable',
			'agent',
			'folder',
			'execution',
		]);
	});

	it('only claims scopes the personal project owner holds', () => {
		const personalOwnerScopes = PROJECT_SCOPE_MAP['project:personalOwner'];
		for (const group of PERSONAL_SPACE_GROUPS) {
			for (const resource of PERSONAL_SPACE_RESOURCES) {
				const scopes = PERSONAL_SPACE_ROW_SCOPES[group][resource];
				expect(scopes.length).toBeGreaterThan(0);
				for (const scope of scopes) {
					expect(personalOwnerScopes).toContain(scope);
				}
			}
		}
	});

	it('has a label and a tooltip for every row', () => {
		for (const group of PERSONAL_SPACE_GROUPS) {
			expect(PERSONAL_SPACE_GROUP_LABEL_KEYS[group]).toBeTruthy();
			for (const resource of PERSONAL_SPACE_RESOURCES) {
				expect(PERSONAL_SPACE_RESOURCE_LABEL_KEYS[resource]).toBeTruthy();
				expect(PERSONAL_SPACE_TOOLTIP_KEYS[group][resource]).toBeTruthy();
			}
		}
	});
});
