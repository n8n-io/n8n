import {
	NodeConnectionTypes,
	type ISupplyDataFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { getSessionId } from '@utils/helpers';
import type { N8nStateManager } from '@utils/N8nStateManager';

export class SlotFillingStateSingleton {
	private static instance: SlotFillingStateSingleton;

	private stateBuffer: Map<string, Record<string, any>>;

	private constructor() {
		this.stateBuffer = new Map();
	}

	static getInstance(): SlotFillingStateSingleton {
		if (!SlotFillingStateSingleton.instance) {
			SlotFillingStateSingleton.instance = new SlotFillingStateSingleton();
		}
		return SlotFillingStateSingleton.instance;
	}

	getState(sessionId: string): Record<string, any> | undefined {
		return this.stateBuffer.get(sessionId);
	}

	setState(sessionId: string, data: Record<string, any>): void {
		this.stateBuffer.set(sessionId, data);
	}

	updateState(sessionId: string, updates: Record<string, any>): void {
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
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const sessionId = getSessionId(this, itemIndex);
		const singleton = SlotFillingStateSingleton.getInstance();

		// Create a state manager object
		const stateManager = {
			get: (key?: string) => {
				const state = singleton.getState(sessionId);
				if (key && state) {
					return state[key];
				}
				return state;
			},
			set: (data: Record<string, any>) => {
				singleton.setState(sessionId, data);
			},
			update: (updates: Record<string, any>) => {
				singleton.updateState(sessionId, updates);
			},
			delete: () => {
				singleton.deleteState(sessionId);
			},
			has: () => {
				return singleton.hasState(sessionId);
			},
		};

		return {
			response: stateManager as N8nStateManager,
		};
	}
}
