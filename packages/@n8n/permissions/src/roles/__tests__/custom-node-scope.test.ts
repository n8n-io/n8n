import { RESOURCES } from '@/constants.ee';
import {
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	GLOBAL_OWNER_SCOPES,
} from '@/roles/scopes/global-scopes.ee';

describe('customNode scopes', () => {
	const all = ['customNode:list', 'customNode:create', 'customNode:update', 'customNode:delete'];

	it('offers list, create, update and delete', () => {
		expect(RESOURCES.customNode).toEqual(['list', 'create', 'update', 'delete']);
	});

	it('gives owner and admin all four scopes', () => {
		for (const scopes of [GLOBAL_OWNER_SCOPES, GLOBAL_ADMIN_SCOPES]) {
			expect(scopes).toEqual(expect.arrayContaining(all));
		}
	});

	it('gives member only the list scope', () => {
		expect(GLOBAL_MEMBER_SCOPES.filter((s) => s.startsWith('customNode:'))).toEqual([
			'customNode:list',
		]);
	});
});
