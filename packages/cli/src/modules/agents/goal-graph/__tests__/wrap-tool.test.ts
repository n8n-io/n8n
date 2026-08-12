import { AgentEvent, type AgentEventData, type BuiltTool, type ToolContext } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';
import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import type { GoalGraphStateService } from '../goal-graph-state.service';
import type { GoalGraphDefinition, SlotValues } from '../types';
import { wrapGoalTool } from '../wrap-tool';

const definition: GoalGraphDefinition = {
	slots: [
		{ name: 'customerEmail', type: 'string', access: 'standard' },
		{ name: 'customerSalesforceId', type: 'string', access: 'protected' },
		{ name: 'trialExtendedUntil', type: 'string', access: 'protected' },
	],
	goals: [
		{
			id: 'verify_customer',
			name: 'Verify the customer',
			instructions: 'Verify',
			achievedWhen: '={{ $state.customerSalesforceId !== null }}',
		},
		{
			id: 'extend_trial',
			name: 'Extend the trial',
			instructions: 'Extend',
			requires: ['verify_customer'],
			achievedWhen: '={{ $state.trialExtendedUntil !== null }}',
		},
	],
};

const extendTrialAttachment = {
	goalId: 'extend_trial',
	attachment: {
		tool: 'extend_trial',
		bindings: { customerId: '={{ $state.customerSalesforceId }}' },
		outputMappings: { trialExtendedUntil: '={{ $json.newTrialEnd }}' },
	},
};

function makeStateService(initial: SlotValues) {
	const state: SlotValues = {
		customerEmail: null,
		customerSalesforceId: null,
		trialExtendedUntil: null,
		...initial,
	};
	const stateService = mock<GoalGraphStateService>();
	stateService.getState.mockImplementation(() => state);
	stateService.setSlot.mockImplementation((_agentId, _persistence, _definition, slot, value) => {
		const previous = state[slot];
		state[slot] = value as SlotValues[string];
		return { previous };
	});
	return { stateService, state };
}

function makeCtx(events: AgentEventData[]): ToolContext {
	return {
		persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
		emitEvent: (event) => events.push(event),
	};
}

const inputSchema: JSONSchema7 = {
	type: 'object',
	properties: {
		customerId: { type: 'string' },
		days: { type: 'number' },
	},
	required: ['customerId', 'days'],
};

function makeTool(handler: ReturnType<typeof vi.fn>): BuiltTool {
	return {
		name: 'extend_trial',
		description: 'Extend a trial',
		inputSchema,
		handler: handler as unknown as BuiltTool['handler'],
	};
}

describe('wrapGoalTool', () => {
	it('removes bound parameters from the LLM-visible schema', () => {
		const wrapped = wrapGoalTool({
			tool: makeTool(vi.fn()),
			attachments: [extendTrialAttachment],
			definition,
			agentId: 'agent-1',
			stateService: makeStateService({}).stateService,
		});

		const schema = wrapped.inputSchema as JSONSchema7;
		expect(Object.keys(schema.properties ?? {})).toEqual(['days']);
		expect(schema.required).toEqual(['days']);
	});

	it('refuses execution while the goal is locked, without calling the tool', async () => {
		const handler = vi.fn();
		const wrapped = wrapGoalTool({
			tool: makeTool(handler),
			attachments: [extendTrialAttachment],
			definition,
			agentId: 'agent-1',
			stateService: makeStateService({}).stateService, // verify_customer not achieved
		});

		const result = await wrapped.handler!({ days: 14 }, makeCtx([]));

		expect(handler).not.toHaveBeenCalled();
		expect(result).toMatchObject({ locked: true });
	});

	it('injects bound parameters from state, overriding any model-supplied value', async () => {
		const handler = vi.fn().mockResolvedValue({ newTrialEnd: '2026-07-01' });
		const { stateService } = makeStateService({ customerSalesforceId: 'SF-1' });
		const wrapped = wrapGoalTool({
			tool: makeTool(handler),
			attachments: [extendTrialAttachment],
			definition,
			agentId: 'agent-1',
			stateService,
		});

		await wrapped.handler!({ days: 14, customerId: 'SPOOFED' }, makeCtx([]));

		expect(handler).toHaveBeenCalledWith({ days: 14, customerId: 'SF-1' }, expect.anything());
	});

	it('applies output mappings, writes slots, and emits change events', async () => {
		const handler = vi.fn().mockResolvedValue({ newTrialEnd: '2026-07-01' });
		const { stateService, state } = makeStateService({ customerSalesforceId: 'SF-1' });
		const events: AgentEventData[] = [];
		const wrapped = wrapGoalTool({
			tool: makeTool(handler),
			attachments: [extendTrialAttachment],
			definition,
			agentId: 'agent-1',
			stateService,
		});

		const result = await wrapped.handler!({ days: 14 }, makeCtx(events));

		expect(result).toEqual({ newTrialEnd: '2026-07-01' });
		expect(state.trialExtendedUntil).toBe('2026-07-01');

		const names = events.map((event) =>
			event.type === AgentEvent.Custom ? event.name : event.type,
		);
		expect(names).toContain('goal-slot-changed');
		expect(names).toContain('goal-status-changed');

		const statusEvent = events.find(
			(event) => event.type === AgentEvent.Custom && event.name === 'goal-status-changed',
		);
		expect(statusEvent && 'payload' in statusEvent ? statusEvent.payload : undefined).toMatchObject(
			{
				changes: [{ goalId: 'extend_trial', from: 'active', to: 'achieved' }],
			},
		);
	});

	it('coerces an injected string to number when a zod input schema demands it', async () => {
		const handler = vi.fn().mockResolvedValue({ newTrialEnd: '2026-07-01' });
		// The lookup wrote a string id into state, but the tool declares a number.
		const { stateService } = makeStateService({ customerSalesforceId: '100500' });
		const wrapped = wrapGoalTool({
			tool: {
				name: 'extend_trial',
				description: 'Extend a trial',
				inputSchema: z.object({ customerId: z.number(), days: z.number() }),
				handler: handler as unknown as BuiltTool['handler'],
			},
			attachments: [extendTrialAttachment],
			definition,
			agentId: 'agent-1',
			stateService,
		});

		await wrapped.handler!({ days: 14 }, makeCtx([]));

		expect(handler).toHaveBeenCalledWith({ days: 14, customerId: 100500 }, expect.anything());
	});

	it('coerces an injected string to number when a JSON input schema demands it', async () => {
		const handler = vi.fn().mockResolvedValue({ newTrialEnd: '2026-07-01' });
		const { stateService } = makeStateService({ customerSalesforceId: '100500' });
		const numberSchema: JSONSchema7 = {
			type: 'object',
			properties: { customerId: { type: 'number' }, days: { type: 'number' } },
			required: ['customerId', 'days'],
		};
		const wrapped = wrapGoalTool({
			tool: {
				name: 'extend_trial',
				description: 'Extend a trial',
				inputSchema: numberSchema,
				handler: handler as unknown as BuiltTool['handler'],
			},
			attachments: [extendTrialAttachment],
			definition,
			agentId: 'agent-1',
			stateService,
		});

		await wrapped.handler!({ days: 14 }, makeCtx([]));

		expect(handler).toHaveBeenCalledWith({ days: 14, customerId: 100500 }, expect.anything());
	});

	it('keeps the injected value untouched when it already fits the schema', async () => {
		const handler = vi.fn().mockResolvedValue({ newTrialEnd: '2026-07-01' });
		const { stateService } = makeStateService({ customerSalesforceId: 'SF-1' });
		const wrapped = wrapGoalTool({
			tool: {
				name: 'extend_trial',
				description: 'Extend a trial',
				inputSchema: z.object({ customerId: z.string(), days: z.number() }),
				handler: handler as unknown as BuiltTool['handler'],
			},
			attachments: [extendTrialAttachment],
			definition,
			agentId: 'agent-1',
			stateService,
		});

		await wrapped.handler!({ days: 14 }, makeCtx([]));

		expect(handler).toHaveBeenCalledWith({ days: 14, customerId: 'SF-1' }, expect.anything());
	});

	it('stores mapped output values in the slot-declared type', async () => {
		// The tool returns the trial end as a number; the slot declares string.
		const handler = vi.fn().mockResolvedValue({ newTrialEnd: 20260701 });
		const { stateService, state } = makeStateService({ customerSalesforceId: 'SF-1' });
		const wrapped = wrapGoalTool({
			tool: makeTool(handler),
			attachments: [extendTrialAttachment],
			definition,
			agentId: 'agent-1',
			stateService,
		});

		await wrapped.handler!({ days: 14 }, makeCtx([]));

		expect(state.trialExtendedUntil).toBe('20260701');
	});

	it('respects availableWhen on the attachment', async () => {
		const handler = vi.fn();
		const { stateService } = makeStateService({ customerSalesforceId: 'SF-1' });
		const wrapped = wrapGoalTool({
			tool: makeTool(handler),
			attachments: [
				{
					goalId: 'extend_trial',
					attachment: {
						tool: 'extend_trial',
						availableWhen: '={{ $state.customerEmail !== null }}', // not met
					},
				},
			],
			definition,
			agentId: 'agent-1',
			stateService,
		});

		const result = await wrapped.handler!({ days: 14 }, makeCtx([]));
		expect(handler).not.toHaveBeenCalled();
		expect(result).toMatchObject({ locked: true });
	});
});
