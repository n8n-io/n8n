import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { SimulationBackendRegistry } from '../simulation-backend-registry';
import { GymSimulationBackend } from './gym-simulation-backend';

/**
 * Serve agent test chats from the in-process AI Gym when `N8N_AGENTS_SIMULATION_BACKEND=gym`.
 * The instance AI module registers the LLM mock only for `llm-mock`, so the order of the two
 * modules does not matter. Until a module binds the Gym, the backend blocks every simulated call.
 * It never falls back to the LLM mock.
 */
export function registerGymSimulationBackend(): void {
	if (Container.get(AgentsConfig).simulationBackend !== 'gym') return;
	Container.get(SimulationBackendRegistry).register(Container.get(GymSimulationBackend));
}
