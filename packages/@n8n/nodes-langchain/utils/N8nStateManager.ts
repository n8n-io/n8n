import { NodeConnectionTypes } from 'n8n-workflow';
import type { GenericValue, type IExecuteFunctions } from 'n8n-workflow';

import type { DynamicZodObject } from 'types/zod.types';

export type N8nStateManager = BaseN8nStateManager;

export interface Slot {
	name: string;
	description: string;
	required: boolean;
}

export interface StateDefinition {
	name: string;
	description: string;
	slots: Slot[];
	targetState: string;
}

export interface N8nStateMachine {
	states: StateDefinition[];
	initialState: string;
}

export interface CurrentState {
	currentState: string;
	// Statename -> SlotName -> SlotValue
	slots: Map<string, Map<string, GenericValue>>;
}

export interface BaseN8nStateManager {
	getStateSchema(): DynamicZodObject;
	getCurrentState: () => string;
	getPrompt: () => string;
	setState: (
		context: IExecuteFunctions,
		slotName: string,
		slotValue: unknown,
	) => Promise<CurrentState | undefined>;
	clearState: (context: IExecuteFunctions) => Promise<void>;
}

export class N8nStateManager implements BaseN8nStateManager {}

export async function getOptionalStateManager(
	ctx: IExecuteFunctions,
): Promise<N8nStateManager | undefined> {
	let stateManager: N8nStateManager | undefined;

	if (ctx.getNodeParameter('hasStateManager', 0, true) === true) {
		stateManager = (
			await ctx.getInputConnectionData(NodeConnectionTypes.AiStateManager, 0)
		)[0] as N8nStateManager;
	}

	return stateManager;
}
