import { UsersListFilterDto } from '../users-list-filter.dto';

describe('UsersListFilterDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'pagination with default values',
				request: {},
				parsedResult: { skip: 0, take: 10 },
			},
			{
				name: 'pagination with custom values',
				request: { skip: '5', take: '20' },
				parsedResult: { skip: 5, take: 20 },
			},
			{
				name: 'sort by firstName ascending',
				request: { sortBy: ['firstName:asc'] },
				parsedResult: { skip: 0, take: 10, sortBy: ['firstName:asc'] },
			},
			{
				name: 'sort by lastName ascending',
				request: { sortBy: ['lastName:asc'] },
				parsedResult: { skip: 0, take: 10, sortBy: ['lastName:asc'] },
			},
			{
				name: 'sort by role descending and pagination',
				request: { skip: '5', take: '20', sortBy: ['role:desc'] },
				parsedResult: { skip: 5, take: 20, sortBy: ['role:desc'] },
			},
			{
				name: 'select specific fields',
				request: { select: ['id', 'firstName', 'email'] },
				parsedResult: { skip: 0, take: 10, select: ['id', 'firstName', 'email'] },
			},
			{
				name: 'select all available fields',
				request: {
					select: ['id', 'firstName', 'lastName', 'email', 'disabled', 'mfaEnabled', 'role'],
				},
				parsedResult: {
					skip: 0,
					take: 10,
					select: ['id', 'firstName', 'lastName', 'email', 'disabled', 'mfaEnabled', 'role'],
				},
			},
			{
				name: 'filter by ids',
				request: { filter: JSON.stringify({ ids: ['user1', 'user2'] }) },
				parsedResult: { skip: 0, take: 10, filter: { ids: ['user1', 'user2'] } },
			},
			{
				name: 'filter by isOwner',
				request: { filter: JSON.stringify({ isOwner: true }) },
				parsedResult: { skip: 0, take: 10, filter: { isOwner: true } },
			},
			{
				name: 'filter by firstName',
				request: { filter: JSON.stringify({ firstName: 'John' }) },
				parsedResult: { skip: 0, take: 10, filter: { firstName: 'John' } },
			},
			{
				name: 'filter by lastName',
				request: { filter: JSON.stringify({ lastName: 'Doe' }) },
				parsedResult: { skip: 0, take: 10, filter: { lastName: 'Doe' } },
			},
			{
				name: 'filter by email',
				request: { filter: JSON.stringify({ email: 'john@example.com' }) },
				parsedResult: { skip: 0, take: 10, filter: { email: 'john@example.com' } },
			},
			{
				name: 'filter by mfaEnabled',
				request: { filter: JSON.stringify({ mfaEnabled: true }) },
				parsedResult: { skip: 0, take: 10, filter: { mfaEnabled: true } },
			},
			{
				name: 'filter by fullText',
				request: { filter: JSON.stringify({ fullText: 'search term' }) },
				parsedResult: { skip: 0, take: 10, filter: { fullText: 'search term' } },
			},
			{
				name: 'filter by isPending',
				request: { filter: JSON.stringify({ isPending: true }) },
				parsedResult: { skip: 0, take: 10, filter: { isPending: true } },
			},
			{
				name: 'filter with multiple criteria',
				request: {
					filter: JSON.stringify({ firstName: 'John', mfaEnabled: false, isPending: false }),
				},
				parsedResult: {
					skip: 0,
					take: 10,
					filter: { firstName: 'John', mfaEnabled: false, isPending: false },
				},
			},
			{
				name: 'expand projectRelations',
				request: { expand: ['projectRelations'] },
				parsedResult: { skip: 0, take: 10, expand: ['projectRelations'] },
			},
			{
				name: 'complete request with all parameters',
				request: {
					skip: '10',
					take: '25',
					select: ['id', 'firstName', 'email'],
					filter: JSON.stringify({ mfaEnabled: true }),
					sortBy: ['lastName:asc'],
					expand: ['projectRelations'],
				},
				parsedResult: {
					skip: 10,
					take: 25,
					select: ['id', 'firstName', 'email'],
					filter: { mfaEnabled: true },
					sortBy: ['lastName:asc'],
					expand: ['projectRelations'],
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = UsersListFilterDto.safeParse(request);
			expect(result.success).toBe(true);
			if (parsedResult) {
				expect(result.data).toMatchObject(parsedResult);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid skip format',
				request: {
					skip: 'not-a-number',
					take: '10',
				},
				expectedErrorPath: ['skip'],
			},
			{
				name: 'invalid take format',
				request: {
					skip: '0',
					take: 'not-a-number',
				},
				expectedErrorPath: ['take'],
			},
			{
				name: 'invalid sortBy value',
				request: {
					sortBy: 'invalid-value',
				},
				expectedErrorPath: ['sortBy'],
			},
			{
				name: 'invalid select field',
				request: {
					select: ['id', 'invalidField'],
				},
				expectedErrorPath: ['select'],
			},
			{
				name: 'select as string instead of array',
				request: {
					select: 'id',
				},
				expectedErrorPath: ['select'],
			},
			{
				name: 'invalid filter JSON format',
				request: {
					filter: 'not-valid-json',
				},
				expectedErrorPath: ['filter'],
			},
			{
				name: 'invalid filter ids type',
				request: {
					filter: JSON.stringify({ ids: 'not-an-array' }),
				},
				expectedErrorPath: ['filter'],
			},
			{
				name: 'invalid filter isOwner type',
				request: {
					filter: JSON.stringify({ isOwner: 'not-a-boolean' }),
				},
				expectedErrorPath: ['filter'],
			},
			{
				name: 'invalid filter mfaEnabled type',
				request: {
					filter: JSON.stringify({ mfaEnabled: 'not-a-boolean' }),
				},
				expectedErrorPath: ['filter'],
			},
			{
				name: 'invalid filter isPending type',
				request: {
					filter: JSON.stringify({ isPending: 'not-a-boolean' }),
				},
				expectedErrorPath: ['filter'],
			},
			{
				name: 'invalid expand value',
				request: {
					expand: ['invalidExpand'],
				},
				expectedErrorPath: ['expand'],
			},
			{
				name: 'expand as string instead of array',
				request: {
					expand: 'projectRelations',
				},
				expectedErrorPath: ['expand'],
			},
		])('should invalidate $name', ({ request, expectedErrorPath }) => {
			const result = UsersListFilterDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath && !result.success) {
				if (Array.isArray(expectedErrorPath)) {
					const errorPaths = result.error.issues[0].path;
					expect(errorPaths).toContain(expectedErrorPath[0]);
				}
			}
		});
	});
});
