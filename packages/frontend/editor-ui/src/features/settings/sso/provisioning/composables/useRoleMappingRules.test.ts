import { createPinia, setActivePinia } from 'pinia';
import { useRoleMappingRules } from './useRoleMappingRules';
import * as roleMappingRuleApi from '@n8n/rest-api-client/api/roleMappingRule';

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

	it('should start with empty rules and not dirty', () => {
		expect(composable.instanceRules.value).toEqual([]);
		expect(composable.projectRules.value).toEqual([]);
		expect(composable.isDirty.value).toBe(false);
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
		it('should update a rule field and mark dirty', () => {
			composable.addRule('instance');
			const id = composable.instanceRules.value[0].id;

			composable.updateRule(id, { expression: '$claims.admin === true' });

			expect(composable.instanceRules.value[0].expression).toBe('$claims.admin === true');
			expect(composable.isDirty.value).toBe(true);
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
	});

	describe('loadRules', () => {
		it('should load rules from the API and reset dirty state', async () => {
			composable.addRule('instance');
			expect(composable.isDirty.value).toBe(true);

			await composable.loadRules();

			expect(composable.instanceRules.value).toEqual([]);
			expect(composable.isDirty.value).toBe(false);
		});
	});
});
