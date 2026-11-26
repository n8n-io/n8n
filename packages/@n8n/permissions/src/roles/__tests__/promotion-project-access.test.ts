import {
	getPromotionScopesOfProjectRoles,
	type PromotionProjectAccessSettings,
} from '@/roles/promotion-project-access.ee';

const instanceAdminsOnly: PromotionProjectAccessSettings = {
	whoCanPromote: 'instanceAdmins',
	whoCanApprove: 'instanceAdmins',
	whoCanApply: 'instanceAdmins',
};

describe('getPromotionScopesOfProjectRoles', () => {
	it.each([
		{
			name: 'instance admins only gives project roles nothing',
			access: {},
			admin: [],
			editor: [],
		},
		{
			name: 'promote by project admins gives admins promote and readReviews, editors nothing',
			access: { whoCanPromote: 'projectAdmins' },
			admin: ['promotions:promote', 'promotions:readReviews'],
			editor: [],
		},
		{
			name: 'approve by project admins and editors gives both readReviews and approveReviews',
			access: { whoCanApprove: 'projectAdminsAndEditors' },
			admin: ['promotions:readReviews', 'promotions:approveReviews'],
			editor: ['promotions:readReviews', 'promotions:approveReviews'],
		},
		{
			name: 'editors keep readReviews from approve when only admins can promote',
			access: { whoCanPromote: 'projectAdmins', whoCanApprove: 'projectAdminsAndEditors' },
			admin: ['promotions:promote', 'promotions:readReviews', 'promotions:approveReviews'],
			editor: ['promotions:readReviews', 'promotions:approveReviews'],
		},
	] satisfies Array<{
		name: string;
		access: Partial<PromotionProjectAccessSettings>;
		admin: string[];
		editor: string[];
	}>)('$name', ({ access, admin, editor }) => {
		expect(getPromotionScopesOfProjectRoles({ ...instanceAdminsOnly, ...access })).toEqual({
			'project:admin': admin,
			'project:editor': editor,
		});
	});
});
