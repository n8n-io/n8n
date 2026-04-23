import { createPinia, setActivePinia } from 'pinia';
import { useRoleMappingRules } from './useRoleMappingRules';
import * as roleMappingRuleApi from '@n8n/rest-api-client/api/roleMappingRule';
import type { RoleMappingRuleResponse } from '@n8n/rest-api-client/api/roleMappingRule';

vi.mock('@n8n/rest-api-client/api/roleMappingRule');
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
	}),
}));

describe('useRoleMappingRules', () => {
	let composable: ReturnType<typeof useRoleMappingRules>;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([]);
		composable = useRoleMappingRules();
	});

	const makeRule = (overrides: Partial<RoleMappingRuleResponse> = {}): RoleMappingRuleResponse => ({
		id: `rule-${Math.random()}`,
		expression: '',
		role: '',
		type: 'instance',
		order: 0,
		projectIds: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	});

	it('should start with empty rules and not dirty', () => {
		expect(composable.instanceRules.value).toEqual([]);
		expect(composable.projectRules.value).toEqual([]);
		expect(composable.isDirty.value).toBe(false);
	});

	it('should initialize fallbackInstanceRole to global:member', () => {
		expect(composable.fallbackInstanceRole.value).toBe('global:member');
	});

	describe('addRule', () => {
		it('should add an instance rule with default values', () => {
			composable.addRule('instance');
			expect(composable.instanceRules.value).toHaveLength(1);
			expect(composable.instanceRules.value[0].type).toBe('instance');
			expect(composable.instanceRules.value[0].expression).toBe('');
			expect(composable.instanceRules.value[0].role).toBe('');
			expect(composable.isDirty.value).toBe(true);
		});

		it('should add a project rule with default values', () => {
			composable.addRule('project');
			expect(composable.projectRules.value).toHaveLength(1);
			expect(composable.projectRules.value[0].type).toBe('project');
			expect(composable.isDirty.value).toBe(true);
		});

		it('should assign sequential order values', () => {
			composable.addRule('instance');
			composable.addRule('instance');
			expect(composable.instanceRules.value[0].order).toBe(0);
			expect(composable.instanceRules.value[1].order).toBe(1);
		});
	});

	describe('updateRule', () => {
		it('should update an instance rule field and mark dirty', () => {
			composable.addRule('instance');
			const id = composable.instanceRules.value[0].id;

			composable.updateRule(id, { expression: '$claims.admin === true' });

			expect(composable.instanceRules.value[0].expression).toBe('$claims.admin === true');
			expect(composable.isDirty.value).toBe(true);
		});

		it('should update a project rule field', () => {
			composable.addRule('project');
			const id = composable.projectRules.value[0].id;

			composable.updateRule(id, { role: 'project:editor' });

			expect(composable.projectRules.value[0].role).toBe('project:editor');
		});
	});

	describe('deleteRule', () => {
		it('should remove the rule and mark dirty', () => {
			composable.addRule('instance');
			const id = composable.instanceRules.value[0].id;

			composable.deleteRule(id);

			expect(composable.instanceRules.value).toHaveLength(0);
			expect(composable.isDirty.value).toBe(true);
		});

		it('should renumber remaining rules after deletion', () => {
			composable.addRule('instance');
			composable.addRule('instance');
			composable.addRule('instance');
			const firstId = composable.instanceRules.value[0].id;

			composable.deleteRule(firstId);

			expect(composable.instanceRules.value).toHaveLength(2);
			expect(composable.instanceRules.value[0].order).toBe(0);
			expect(composable.instanceRules.value[1].order).toBe(1);
		});
	});

	describe('reorder', () => {
		it('should swap the order of two instance rules', async () => {
			composable.addRule('instance');
			composable.addRule('instance');
			composable.instanceRules.value[0].expression = 'first';
			composable.instanceRules.value[1].expression = 'second';

			await composable.reorder('instance', 0, 1);

			expect(composable.instanceRules.value[0].expression).toBe('second');
			expect(composable.instanceRules.value[1].expression).toBe('first');
			expect(composable.isDirty.value).toBe(true);
		});

		it('should call moveRule API for persisted rules', async () => {
			vi.mocked(roleMappingRuleApi.moveRoleMappingRule).mockResolvedValue(
				makeRule({ id: 'persisted-1' }),
			);
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				makeRule({ id: 'persisted-1', type: 'instance', order: 0, expression: 'first' }),
				makeRule({ id: 'persisted-2', type: 'instance', order: 1, expression: 'second' }),
			]);

			await composable.loadRules();

			await composable.reorder('instance', 0, 1);

			expect(roleMappingRuleApi.moveRoleMappingRule).toHaveBeenCalledWith(
				expect.anything(),
				'persisted-1',
				1,
			);
		});

		it('should not call moveRule API for local rules', async () => {
			composable.addRule('instance');
			composable.addRule('instance');

			await composable.reorder('instance', 0, 1);

			expect(roleMappingRuleApi.moveRoleMappingRule).not.toHaveBeenCalled();
		});

		it('should rollback by reloading rules when moveRule API fails', async () => {
			vi.mocked(roleMappingRuleApi.moveRoleMappingRule).mockRejectedValue(new Error('API error'));
			const originalRules = [
				makeRule({ id: 'persisted-1', type: 'instance', order: 0, expression: 'first' }),
				makeRule({ id: 'persisted-2', type: 'instance', order: 1, expression: 'second' }),
			];
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue(originalRules);

			await composable.loadRules();
			vi.clearAllMocks();
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue(originalRules);

			await composable.reorder('instance', 0, 1);

			// Should have called loadRules to rollback
			expect(roleMappingRuleApi.listRoleMappingRules).toHaveBeenCalled();
			// After rollback, order should be restored
			expect(composable.instanceRules.value[0].expression).toBe('first');
			expect(composable.instanceRules.value[1].expression).toBe('second');
		});
	});

	describe('loadRules', () => {
		it('should load rules from the API and reset dirty state', async () => {
			composable.addRule('instance');
			expect(composable.isDirty.value).toBe(true);

			await composable.loadRules();

			expect(composable.instanceRules.value).toEqual([]);
			expect(composable.isDirty.value).toBe(false);
		});

		it('should split rules by type into instanceRules and projectRules', async () => {
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				makeRule({ id: 'i1', type: 'instance', order: 0 }),
				makeRule({ id: 'i2', type: 'instance', order: 1 }),
				makeRule({ id: 'p1', type: 'project', order: 0 }),
			]);

			await composable.loadRules();

			expect(composable.instanceRules.value).toHaveLength(2);
			expect(composable.projectRules.value).toHaveLength(1);
			expect(composable.instanceRules.value.every((r) => r.type === 'instance')).toBe(true);
			expect(composable.projectRules.value.every((r) => r.type === 'project')).toBe(true);
		});
	});
});
