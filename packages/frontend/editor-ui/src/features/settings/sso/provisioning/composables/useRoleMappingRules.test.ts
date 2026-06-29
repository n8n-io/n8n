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

	describe('discardProjectRules', () => {
		it('clears local project rules (both persisted and unsaved local-* ones)', async () => {
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				makeRule({ id: 'i1', type: 'instance', order: 0 }),
				makeRule({ id: 'p1', type: 'project', order: 0, projectIds: ['proj-1'] }),
			]);

			await composable.loadRules();
			composable.addRule('project');
			expect(composable.projectRules.value).toHaveLength(2);

			composable.discardProjectRules();

			expect(composable.projectRules.value).toEqual([]);
			expect(composable.instanceRules.value).toHaveLength(1);
		});

		it('prevents save() from PATCHing a stale server-backed project rule that backend has deleted', async () => {
			// Scenario: editor loaded a project rule p1 at init. Backend then
			// deleted p1 out-of-band (via config patch deleteProjectRules or curl).
			// Editor state still references p1 but user is in instance_and_project
			// mode and triggers a save. The defensive resync in save() should
			// spot that p1 is gone and skip the PATCH call — preventing 404.
			vi.mocked(roleMappingRuleApi.listRoleMappingRules)
				.mockResolvedValueOnce([
					makeRule({ id: 'i1', type: 'instance', order: 0 }),
					makeRule({ id: 'p1', type: 'project', order: 0, projectIds: ['proj-1'] }),
				])
				// Second call (defensive resync inside save) returns only the instance rule
				.mockResolvedValueOnce([makeRule({ id: 'i1', type: 'instance', order: 0 })])
				// Third call (post-save loadRules) same fresh state
				.mockResolvedValueOnce([makeRule({ id: 'i1', type: 'instance', order: 0 })]);

			await composable.loadRules();

			// Editor state still has p1 — user did NOT call discardProjectRules
			expect(composable.projectRules.value).toHaveLength(1);

			await composable.save();

			// The 404-causing PATCH must not fire for the deleted project rule
			expect(roleMappingRuleApi.updateRoleMappingRule).not.toHaveBeenCalledWith(
				expect.anything(),
				'p1',
				expect.anything(),
			);
		});

		it('prevents save() from trying to DELETE or UPDATE project rules that the backend already removed', async () => {
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				makeRule({ id: 'i1', type: 'instance', order: 0 }),
				makeRule({ id: 'p1', type: 'project', order: 0, projectIds: ['proj-1'] }),
			]);
			vi.mocked(roleMappingRuleApi.updateRoleMappingRule).mockResolvedValue(
				{} as RoleMappingRuleResponse,
			);
			vi.mocked(roleMappingRuleApi.deleteRoleMappingRule).mockResolvedValue(undefined);
			vi.mocked(roleMappingRuleApi.createRoleMappingRule).mockResolvedValue(
				{} as RoleMappingRuleResponse,
			);

			await composable.loadRules();
			// Simulate: user added a new project rule (local-*) on top of the existing p1
			composable.addRule('project');
			// Simulate: backend (via deleteProjectRules in config patch) has just wiped project rules
			composable.discardProjectRules();

			// listRules is re-called at the end of save(); stub it for the post-save refresh
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				makeRule({ id: 'i1', type: 'instance', order: 0 }),
			]);

			await composable.save();

			// Critical: the save must NOT try to DELETE or UPDATE p1 — backend already did.
			expect(roleMappingRuleApi.deleteRoleMappingRule).not.toHaveBeenCalled();
			expect(roleMappingRuleApi.updateRoleMappingRule).not.toHaveBeenCalledWith(
				expect.anything(),
				'p1',
				expect.anything(),
			);
			// And it must NOT re-create the locally-added project rule either.
			expect(roleMappingRuleApi.createRoleMappingRule).not.toHaveBeenCalled();
		});
	});

	describe('save', () => {
		it('should send the local order on creates so user-intended position is preserved', async () => {
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				makeRule({ id: 'persisted-1', type: 'instance', order: 0 }),
			]);
			vi.mocked(roleMappingRuleApi.createRoleMappingRule).mockResolvedValue(makeRule());
			vi.mocked(roleMappingRuleApi.updateRoleMappingRule).mockResolvedValue(makeRule());

			await composable.loadRules();
			composable.addRule('instance');
			const localId = composable.instanceRules.value[1].id;
			composable.updateRule(localId, {
				expression: '$claims.admin',
				role: 'global:member',
			});
			// Drag the new local rule above the persisted one.
			await composable.reorder('instance', 1, 0);

			await composable.save();

			expect(roleMappingRuleApi.createRoleMappingRule).toHaveBeenCalledTimes(1);
			const [, payload] = vi.mocked(roleMappingRuleApi.createRoleMappingRule).mock.calls[0];
			expect(payload).toMatchObject({
				expression: '$claims.admin',
				role: 'global:member',
				type: 'instance',
				order: 0,
			});
		});

		it('should serialize create calls to avoid concurrent temp-order collisions', async () => {
			const callOrder: string[] = [];
			vi.mocked(roleMappingRuleApi.createRoleMappingRule).mockImplementation(
				async (_ctx, input) => {
					callOrder.push(input.expression);
					await new Promise((r) => setTimeout(r, 0));
					return makeRule({ expression: input.expression });
				},
			);

			composable.addRule('instance');
			composable.addRule('instance');
			composable.updateRule(composable.instanceRules.value[0].id, { expression: 'first' });
			composable.updateRule(composable.instanceRules.value[1].id, { expression: 'second' });

			await composable.save();

			expect(callOrder).toEqual(['first', 'second']);
		});

		it('should include order on updates to existing persisted rules', async () => {
			vi.mocked(roleMappingRuleApi.listRoleMappingRules).mockResolvedValue([
				makeRule({ id: 'persisted-1', type: 'instance', order: 0, expression: 'orig' }),
			]);
			vi.mocked(roleMappingRuleApi.updateRoleMappingRule).mockResolvedValue(
				makeRule({ id: 'persisted-1' }),
			);

			await composable.loadRules();
			composable.updateRule('persisted-1', { expression: 'edited' });
			await composable.save();

			expect(roleMappingRuleApi.updateRoleMappingRule).toHaveBeenCalledWith(
				expect.anything(),
				'persisted-1',
				expect.objectContaining({ order: 0 }),
			);
		});
	});
});
