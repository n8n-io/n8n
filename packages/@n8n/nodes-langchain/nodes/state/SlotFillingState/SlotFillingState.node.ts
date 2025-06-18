import { jsonParse, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	GenericValue,
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';

import { getSessionId } from '@utils/helpers';
import type { CurrentState, N8nStateMachine, N8nStateManager } from '@utils/N8nStateManager';
import { z } from 'zod';

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
				return z.object({
					slots: z.record(z.string(), z.any()),
				});
			},
			getCurrentState: () => {
				const state = singleton.getState(sessionId);
				return state ? state.currentState : '';
			},
			getPrompt: () => {
				const state = singleton.getState(sessionId);
				return `Current state: ${state?.currentState ?? 'unknown'}`;
			},
			setState: async (context: IExecuteFunctions, slotName, slotValue) => {
				const state =
					singleton.getState(sessionId) ??
					({
						currentState: parsedStateSchema.initialState,
						slots: new Map(),
					} as CurrentState);

				if (!state.slots.has(state.currentState)) {
					state.slots.set(state.currentState, new Map());
				}

				state.slots.get(state.currentState)?.set(slotName, slotValue as GenericValue);

				singleton.updateState(sessionId, state);
				return singleton.getState(sessionId) as CurrentState;
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
