// ---------------------------------------------------------------------------
// The model slots of an Agent config: one walker for the own-model resolver
// and the draft verdict (harness/agent-execution.ts), so both see the same
// models — the main one, sub-agent tiers, and the memory workers.
// ---------------------------------------------------------------------------

import { AgentJsonConfigBaseSchema, type AgentJsonConfig } from '@n8n/api-types';

/** A `{ model, credential }` pair. A reference into the config, so a caller
 *  that cloned the config can rewrite it in place. */
export type ModelCredentialSlot = Pick<AgentJsonConfig, 'model' | 'credential'>;

/** The parts of a config that name models. */
export const AgentModelSlotsViewSchema = AgentJsonConfigBaseSchema.pick({
	model: true,
	credential: true,
	subAgents: true,
	memory: true,
});
export type AgentModelSlotsView = Pick<
	AgentJsonConfig,
	'model' | 'credential' | 'subAgents' | 'memory'
>;

export interface AgentModelSlot {
	slot: string;
	target: ModelCredentialSlot;
}

interface MemoryWorkerSlot {
	slot: string;
	target?: ModelCredentialSlot;
	/** The runtime runs this worker; with no `target` it uses the main model. */
	runs: boolean;
}

/** Every model the config names: main, sub-agent tiers, and memory workers. */
export function agentModelSlots(config: AgentModelSlotsView): AgentModelSlot[] {
	const tiers = Object.entries(config.subAgents?.modelsByDifficulty ?? {});
	return [
		...(config.model ? [{ slot: 'model', target: config }] : []),
		...tiers.flatMap(([level, target]) =>
			target ? [{ slot: `subAgents.modelsByDifficulty.${level}`, target }] : [],
		),
		...memoryWorkerSlots(config.memory).flatMap(({ slot, target }) =>
			target ? [{ slot, target }] : [],
		),
	];
}

/** Memory workers that will run but name no model: they run on the main one. */
export function unsetMemoryWorkerSlots(memory: AgentJsonConfig['memory']): string[] {
	return memoryWorkerSlots(memory).flatMap(({ slot, target, runs }) =>
		runs && !target ? [slot] : [],
	);
}

/** Observational memory runs unless turned off; episodic only when turned on. */
function memoryWorkerSlots(memory: AgentJsonConfig['memory']): MemoryWorkerSlot[] {
	const observational = memory?.observationalMemory;
	const episodic = memory?.episodicMemory?.enabled ? memory.episodicMemory : undefined;
	const observes = memory?.enabled === true && observational?.enabled !== false;
	return [
		{
			slot: 'memory.observationalMemory.observerModel',
			target: observational?.observerModel,
			runs: observes,
		},
		{
			slot: 'memory.observationalMemory.reflectorModel',
			target: observational?.reflectorModel,
			runs: observes,
		},
		{
			slot: 'memory.episodicMemory.reflectorModel',
			target: episodic?.reflectorModel,
			runs: memory?.enabled === true && episodic !== undefined,
		},
	];
}
