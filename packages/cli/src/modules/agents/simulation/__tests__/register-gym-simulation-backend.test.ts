import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { GymSimulationBackend } from '../gym/gym-simulation-backend';
import { registerGymSimulationBackend } from '../gym/register-gym-simulation-backend';
import { SimulationBackendRegistry } from '../simulation-backend-registry';
import type { SimulationBackend } from '../tool-simulation.contracts';

const llmMock = mock<SimulationBackend>({ id: 'llm-mock' });

function setup(simulationBackend: AgentsConfig['simulationBackend']) {
	Container.set(AgentsConfig, { simulationBackend } as AgentsConfig);
	const registry = new SimulationBackendRegistry();
	Container.set(SimulationBackendRegistry, registry);
	registry.register(llmMock);
	return registry;
}

describe('registerGymSimulationBackend', () => {
	afterEach(() => Container.reset());

	it('keeps the LLM mock by default', () => {
		const registry = setup('llm-mock');

		registerGymSimulationBackend();

		expect(registry.get()).toBe(llmMock);
	});

	it('replaces the LLM mock when the Gym is selected', () => {
		const registry = setup('gym');

		registerGymSimulationBackend();

		expect(registry.get()).toBeInstanceOf(GymSimulationBackend);
	});
});
