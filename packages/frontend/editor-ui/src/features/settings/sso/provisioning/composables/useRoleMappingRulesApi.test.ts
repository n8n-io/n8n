import { createPinia, setActivePinia } from 'pinia';
import { useRoleMappingRulesApi } from './useRoleMappingRulesApi';
import * as roleMappingRuleApi from '@n8n/rest-api-client/api/roleMappingRule';

vi.mock('@n8n/rest-api-client/api/roleMappingRule');
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
	}),
}));

describe('useRoleMappingRulesApi', () => {
	let api: ReturnType<typeof useRoleMappingRulesApi>;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		api = useRoleMappingRulesApi();
	});

	describe('listRules', () => {
		it('should call the REST API and return rules', async () => {
			const mockRules = [
				{ id: '1', expression: 'test', role: 'global:admin', type: 'instance', order: 0 },
			];
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue(
				mockRules as roleMappingRuleApi.RoleMappingRuleResponse[],
			);

			const rules = await api.listRules();

			expect(roleMappingRuleApi.listRoleMappingRules).toHaveBeenCalledWith({});
			expect(rules).toEqual(mockRules);
		});
	});

	describe('createRule', () => {
		it('should call the REST API with the input', async () => {
			const input = {
				expression: '$claims.admin',
				role: 'global:admin',
				type: 'instance' as const,
				order: 0,
			};
			const mockResponse = {
				id: '1',
				...input,
				projectIds: [],
				createdAt: '',
				updatedAt: '',
			};
			vi.mocked(roleMappingRuleApi.createRoleMappingRule).mockResolvedValue(
				mockResponse as roleMappingRuleApi.RoleMappingRuleResponse,
			);

			const result = await api.createRule(input);

			expect(roleMappingRuleApi.createRoleMappingRule).toHaveBeenCalledWith({}, input);
			expect(result.id).toBe('1');
		});
	});

	describe('updateRule', () => {
		it('should call the REST API with id and patch', async () => {
			const mockResponse = { id: '1', expression: 'updated', role: 'global:admin' };
			vi.mocked(roleMappingRuleApi.updateRoleMappingRule).mockResolvedValue(
				mockResponse as roleMappingRuleApi.RoleMappingRuleResponse,
			);

			const result = await api.updateRule('1', { expression: 'updated' });

			expect(roleMappingRuleApi.updateRoleMappingRule).toHaveBeenCalledWith({}, '1', {
				expression: 'updated',
			});
			expect(result.expression).toBe('updated');
		});
	});

	describe('deleteRule', () => {
		it('should call the REST API with the id', async () => {
			vi.mocked(roleMappingRuleApi.deleteRoleMappingRule).mockResolvedValue(undefined);

			await api.deleteRule('1');

			expect(roleMappingRuleApi.deleteRoleMappingRule).toHaveBeenCalledWith({}, '1');
		});
	});

	describe('moveRule', () => {
		it('should call the move endpoint with id and targetIndex', async () => {
			const mockResponse = { id: '1', order: 2 };
			vi.mocked(roleMappingRuleApi.moveRoleMappingRule).mockResolvedValue(
				mockResponse as roleMappingRuleApi.RoleMappingRuleResponse,
			);

			const result = await api.moveRule('1', 2);

			expect(roleMappingRuleApi.moveRoleMappingRule).toHaveBeenCalledWith({}, '1', 2);
			expect(result.order).toBe(2);
		});
	});
});
