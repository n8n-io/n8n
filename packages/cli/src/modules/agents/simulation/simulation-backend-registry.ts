import { Service } from '@n8n/di';

import type { SimulationBackend } from './tool-simulation.contracts';

/**
 * Holds the simulation backend that test runs use. Another module registers
 * it at init (the LLM mock comes from Instance AI). Without a backend, every
 * tool call that needs the simulator is blocked.
 */
@Service()
export class SimulationBackendRegistry {
	private backend: SimulationBackend | undefined;

	register(backend: SimulationBackend): void {
		this.backend = backend;
	}

	get(): SimulationBackend | undefined {
		return this.backend;
	}
}
