import { CreateRoleMappingRuleDto } from '../create-role-mapping-rule.dto';

const VALID_BODY = {
	expression: 'claims.admin === true',
	role: 'global:member',
	type: 'instance' as const,
};

describe('CreateRoleMappingRuleDto', () => {
	describe('Valid requests', () => {
		test.each([
			{ name: 'order omitted', request: { ...VALID_BODY } },
			{ name: 'order zero', request: { ...VALID_BODY, order: 0 } },
			{ name: 'positive integer order', request: { ...VALID_BODY, order: 5 } },
			{
				name: 'project rule with projectIds',
				request: {
					...VALID_BODY,
					type: 'project',
					role: 'project:editor',
					projectIds: ['p1'],
				},
			},
		])('accepts $name', ({ request }) => {
			expect(CreateRoleMappingRuleDto.safeParse(request).success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'negative order', request: { ...VALID_BODY, order: -1 } },
			{ name: 'non-integer order', request: { ...VALID_BODY, order: 1.5 } },
			{ name: 'empty expression', request: { ...VALID_BODY, expression: '' } },
			{ name: 'unknown type', request: { ...VALID_BODY, type: 'unknown' } },
		])('rejects $name', ({ request }) => {
			expect(CreateRoleMappingRuleDto.safeParse(request).success).toBe(false);
		});
	});
});
