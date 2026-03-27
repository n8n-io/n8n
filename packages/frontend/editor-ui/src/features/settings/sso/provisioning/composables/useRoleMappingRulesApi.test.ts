import { useRoleMappingRulesApi } from './useRoleMappingRulesApi';

describe('useRoleMappingRulesApi', () => {
	let api: ReturnType<typeof useRoleMappingRulesApi>;

	beforeEach(() => {
		api = useRoleMappingRulesApi();
	});

	describe('listRules', () => {
		it('should return empty array initially', async () => {
			const rules = await api.listRules();
			expect(rules).toEqual([]);
		});
	});

	describe('createRule', () => {
		it('should create a rule and return it with generated fields', async () => {
			const rule = await api.createRule({
				expression: '$claims.groups.includes("admins")',
				role: 'global:admin',
				type: 'instance',
				order: 0,
			});

			expect(rule).toMatchObject({
				expression: '$claims.groups.includes("admins")',
				role: 'global:admin',
				type: 'instance',
				order: 0,
				enabled: true,
				projectIds: [],
			});
			expect(rule.id).toBeDefined();
			expect(rule.createdAt).toBeDefined();
			expect(rule.updatedAt).toBeDefined();
		});

		it('should persist the created rule in listRules', async () => {
			await api.createRule({
				expression: '$claims.role === "admin"',
				role: 'global:admin',
				type: 'instance',
				order: 0,
			});

			const rules = await api.listRules();
			expect(rules).toHaveLength(1);
		});
	});

	describe('updateRule', () => {
		it('should update the specified fields', async () => {
			const created = await api.createRule({
				expression: '$claims.role === "admin"',
				role: 'global:admin',
				type: 'instance',
				order: 0,
			});

			const updated = await api.updateRule(created.id, {
				expression: '$claims.role === "superadmin"',
			});

			expect(updated.expression).toBe('$claims.role === "superadmin"');
			expect(updated.role).toBe('global:admin');
		});
	});

	describe('deleteRule', () => {
		it('should remove the rule from the store', async () => {
			const created = await api.createRule({
				expression: '$claims.test',
				role: 'global:member',
				type: 'instance',
				order: 0,
			});

			await api.deleteRule(created.id);
			const rules = await api.listRules();
			expect(rules).toHaveLength(0);
		});
	});

	describe('reorderRules', () => {
		it('should reassign sequential orders based on the provided ID list', async () => {
			const rule1 = await api.createRule({
				expression: 'first',
				role: 'global:admin',
				type: 'instance',
				order: 0,
			});
			const rule2 = await api.createRule({
				expression: 'second',
				role: 'global:member',
				type: 'instance',
				order: 1,
			});

			await api.reorderRules('instance', [rule2.id, rule1.id]);

			const rules = await api.listRules();
			const instanceRules = rules
				.filter((r) => r.type === 'instance')
				.sort((a, b) => a.order - b.order);

			expect(instanceRules[0].id).toBe(rule2.id);
			expect(instanceRules[0].order).toBe(0);
			expect(instanceRules[1].id).toBe(rule1.id);
			expect(instanceRules[1].order).toBe(1);
		});
	});
});
