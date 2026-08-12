import type { BuiltTool, ToolContext } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import { createGoalGraphRuntime, hasGoalGraph } from '../create-goal-graph-runtime';
import { FILL_SLOT_TOOL_NAME } from '../fill-slot-tool';
import type { GoalGraphStateService } from '../goal-graph-state.service';
import type { SlotValues } from '../types';

const config = {
	slots: [
		{ name: 'customerEmail', type: 'string' as const, access: 'standard' as const },
		{ name: 'customerSalesforceId', type: 'string' as const, access: 'protected' as const },
	],
	goals: [
		{
			id: 'verify_customer',
			name: 'Verify the customer',
			summary: 'Identify and verify the customer',
			instructions: 'VERIFY-INSTRUCTIONS',
			achievedWhen: '={{ $state.customerSalesforceId !== null }}',
			tools: [{ tool: 'lookup_customer' }],
		},
		{
			id: 'extend_trial',
			name: 'Extend the trial',
			instructions: 'EXTEND-INSTRUCTIONS',
			requires: ['verify_customer'],
			tools: [{ tool: 'extend_trial' }],
		},
	],
};

function makeStateService(initial: SlotValues) {
	const state: SlotValues = { customerEmail: null, customerSalesforceId: null, ...initial };
	const stateService = mock<GoalGraphStateService>();
	stateService.getState.mockImplementation(() => state);
	stateService.setSlot.mockImplementation((_agentId, _persistence, _definition, slot, value) => {
		const previous = state[slot];
		state[slot] = value as SlotValues[string];
		return { previous };
	});
	return { stateService, state };
}

function namedTool(name: string): BuiltTool {
	return { name, description: name, handler: vi.fn() };
}

const persistence = { threadId: 'thread-1', resourceId: 'resource-1' };

describe('createGoalGraphRuntime', () => {
	it('hasGoalGraph detects goal configs', () => {
		expect(hasGoalGraph(config)).toBe(true);
		expect(hasGoalGraph({})).toBe(false);
		expect(hasGoalGraph({ goals: [] })).toBe(false);
	});

	describe('toolsFilter', () => {
		it('hides managed tools whose goal is not active and keeps unmanaged tools', () => {
			const { stateService } = makeStateService({});
			const runtime = createGoalGraphRuntime({ agentId: 'agent-1', config, stateService });

			const tools = [namedTool('lookup_customer'), namedTool('extend_trial'), namedTool('other')];
			const filtered = runtime.toolsFilter(tools, persistence);

			expect(filtered.map((tool) => tool.name)).toEqual(['lookup_customer', 'other']);
		});

		it('reveals tools when their goal becomes active', () => {
			const { stateService } = makeStateService({ customerSalesforceId: 'SF-1' });
			const runtime = createGoalGraphRuntime({ agentId: 'agent-1', config, stateService });

			const tools = [namedTool('lookup_customer'), namedTool('extend_trial')];
			const filtered = runtime.toolsFilter(tools, persistence);

			// verify_customer is achieved → its tool locks; extend_trial is active.
			expect(filtered.map((tool) => tool.name)).toEqual(['extend_trial']);
		});
	});

	describe('instructionsSuffix', () => {
		it('lists all goals with statuses but details only active goals', () => {
			const { stateService } = makeStateService({});
			const runtime = createGoalGraphRuntime({ agentId: 'agent-1', config, stateService });

			const suffix = runtime.instructionsSuffix(persistence);

			expect(suffix).toContain('[ACTIVE] Verify the customer');
			expect(suffix).toContain('[LOCKED] Extend the trial');
			expect(suffix).toContain('VERIFY-INSTRUCTIONS');
			expect(suffix).not.toContain('EXTEND-INSTRUCTIONS');
			expect(suffix).toContain('customerEmail');
		});
	});

	describe('wrapTool / fill_slot', () => {
		it('passes unmanaged tools through untouched', () => {
			const { stateService } = makeStateService({});
			const runtime = createGoalGraphRuntime({ agentId: 'agent-1', config, stateService });
			const tool = namedTool('other');
			expect(runtime.wrapTool(tool)).toBe(tool);
		});

		it('exposes a fill_slot tool restricted to standard slots', async () => {
			const { stateService, state } = makeStateService({});
			const runtime = createGoalGraphRuntime({ agentId: 'agent-1', config, stateService });

			expect(runtime.fillSlotTool?.name).toBe(FILL_SLOT_TOOL_NAME);

			const ctx: ToolContext = { persistence };
			const ok = await runtime.fillSlotTool!.handler!(
				{ slot: 'customerEmail', value: 'a@b.co' },
				ctx,
			);
			expect(ok).toMatchObject({ ok: true });
			expect(state.customerEmail).toBe('a@b.co');

			// Non-standard slots are not accepted (zod enum only covers standard slots).
			await expect(
				runtime.fillSlotTool!.handler!({ slot: 'customerSalesforceId', value: 'SF-1' }, ctx),
			).rejects.toThrow();
			expect(state.customerSalesforceId).toBeNull();
		});

		it('rejects un-coercible fill_slot values without writing', async () => {
			const { stateService, state } = makeStateService({});
			const runtime = createGoalGraphRuntime({ agentId: 'agent-1', config, stateService });

			const result = await runtime.fillSlotTool!.handler!(
				{ slot: 'customerEmail', value: { nested: true } },
				{ persistence },
			);
			expect(result).toMatchObject({ ok: false });
			expect(state.customerEmail).toBeNull();
		});

		it('normalizes fill_slot values to the slot type', async () => {
			const { stateService, state } = makeStateService({});
			const runtime = createGoalGraphRuntime({ agentId: 'agent-1', config, stateService });

			// The model wraps string values in literal quotes to mark them as strings.
			const quoted = await runtime.fillSlotTool!.handler!(
				{ slot: 'customerEmail', value: '"484357"' },
				{ persistence },
			);
			expect(quoted).toMatchObject({ ok: true });
			expect(state.customerEmail).toBe('484357');

			// A numeric value for a string slot is stored as its string form.
			const numeric = await runtime.fillSlotTool!.handler!(
				{ slot: 'customerEmail', value: 484357 },
				{ persistence },
			);
			expect(numeric).toMatchObject({ ok: true });
			expect(state.customerEmail).toBe('484357');
		});
	});
});
