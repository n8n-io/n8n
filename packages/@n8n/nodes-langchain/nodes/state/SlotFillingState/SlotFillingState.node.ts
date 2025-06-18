import { jsonParse, NodeConnectionTypes } from 'n8n-workflow';
import type {
	GenericValue,
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { z } from 'zod';

import { getSessionId } from '@utils/helpers';
import type { CurrentState, N8nStateMachine, N8nStateManager } from '@utils/N8nStateManager';

export class SlotFillingStateSingleton {
	private static instance: SlotFillingStateSingleton;

	// SessionID -> state
	private stateBuffer: Map<string, CurrentState>;

	private constructor() {
		this.stateBuffer = new Map();
	}

	static getInstance(): SlotFillingStateSingleton {
		if (!SlotFillingStateSingleton.instance) {
			SlotFillingStateSingleton.instance = new SlotFillingStateSingleton();
		}
		return SlotFillingStateSingleton.instance;
	}

	getState(sessionId: string): CurrentState | undefined {
		return this.stateBuffer.get(sessionId);
	}

	setState(sessionId: string, data: CurrentState): void {
		this.stateBuffer.set(sessionId, data);
	}

	updateState(sessionId: string, updates: CurrentState): void {
		const currentData = this.getState(sessionId) || {};
		const updatedData = { ...currentData, ...updates };
		this.setState(sessionId, updatedData);
	}

	deleteState(sessionId: string): void {
		this.stateBuffer.delete(sessionId);
	}

	hasState(sessionId: string): boolean {
		return this.stateBuffer.has(sessionId);
	}

	clear(): void {
		this.stateBuffer.clear();
	}
}

export class SlotFillingState implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Slot Filling State',
		name: 'slotFillingState',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'fa:headset',
		group: ['transform'],
		version: [1],
		description: 'Use Slots',
		defaults: {
			name: 'Slot',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
				Memory: ['Other memories'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: [NodeConnectionTypes.AiStateManager],
		outputNames: ['State'],
		properties: [
			{
				displayName: 'Session ID',
				name: 'sessionIdType',
				type: 'options',
				options: [
					{
						name: 'Connected Chat Trigger Node',
						value: 'fromInput',
						description:
							"Looks for an input field called 'sessionId' that is coming from a directly connected Chat Trigger",
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Define below',
						value: 'customKey',
						description:
							'Use an expression to reference data in previous nodes or enter static text',
					},
				],
				default: 'fromInput',
			},
			{
				displayName: 'Session Key',
				name: 'sessionKey',
				type: 'string',
				default: '',
				description: 'The key to use to store session ID in the state',
				displayOptions: {
					show: {
						sessionIdType: ['customKey'],
					},
				},
			},
			{
				displayName: 'State Schema',
				name: 'stateSchema',
				type: 'json',
				default: `{
  "some": "example"
}`,
				noDataExpression: true,
				typeOptions: {
					rows: 10,
				},
				description: 'Define your state machine schema here',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const sessionId = getSessionId(this, itemIndex);
		const singleton = SlotFillingStateSingleton.getInstance();

		const stateSchema = this.getNodeParameter('stateSchema', itemIndex, '') as string;
		const parsedStateSchema = jsonParse<N8nStateMachine>(stateSchema);

		const stateManager: N8nStateManager = {
			getStateSchema: () => {
				// return the schema as a Zod object with string keys (slotNames) and values as GenericValue
				// return z
				// 	.object({
				// 		slots: z
				// 			.record(z.string(), z.any())
				// 			.describe('Values of the slots to save to the state'),
				// 	})
				return z.object({
					slotName: z.string(),
					value: z.any(),
				});
			},
			getCurrentState: () => {
				const state = singleton.getState(sessionId);
				return state ? state.currentState : '';
			},
			getPrompt: () => {
				const state = singleton.getState(sessionId);
				const currentStateName = state ? state.currentState : parsedStateSchema.initialState;

				const slots = state?.slots ?? new Map();

				// Return current state and state of the slots
				return `
Current State: ${currentStateName}
State description: ${JSON.stringify(
					parsedStateSchema.states.find((s) => s.name === currentStateName),
					null,
					2,
				)}
Current Slots:
${JSON.stringify(Object.fromEntries(slots.entries()), null, 2)}
`;
			},
			setState: (slotValue: { slotName: string; value: GenericValue }) => {
				const state =
					singleton.getState(sessionId) ??
					({
						currentState: parsedStateSchema.initialState,
						slots: new Map(),
					} as CurrentState);

				// Update the slots for the current state
				const currentSlots = state.slots.get(state.currentState);
				state.slots.set(state.currentState, {
					...currentSlots,
					[slotValue.slotName]: slotValue.value,
				});

				// If all required slots are filled, move to the next state
				const currentStateDefinition = parsedStateSchema.states.find(
					(s) => s.name === state.currentState,
				);

				if (
					currentStateDefinition &&
					currentStateDefinition.slots.every(
						(slot) =>
							!slot.required ||
							(state.slots.get(state.currentState)?.hasOwnProperty(slot.name) ?? false),
					)
				) {
					const nextState = parsedStateSchema.states.find(
						(s) => s.name === currentStateDefinition.targetState,
					);
					if (nextState) {
						state.currentState = nextState.name;
					}
				}

				singleton.updateState(sessionId, state);

				console.log('State saved:' + JSON.stringify(state, null, 2));

				const currentStateName = state ? state.currentState : parsedStateSchema.initialState;

				const slots = state?.slots ?? new Map();

				return `
Current State: ${currentStateName}
State description: ${JSON.stringify(
					parsedStateSchema.states.find((s) => s.name === currentStateName),
					null,
					2,
				)}
Current Slots:
${JSON.stringify(Object.fromEntries(slots.entries()), null, 2)}
`;
			},
			clearState: async () => {
				singleton.deleteState(sessionId);
			},
		};

		return {
			response: stateManager,
		};
	}
}
