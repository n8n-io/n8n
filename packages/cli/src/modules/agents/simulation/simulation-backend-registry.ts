import { Service } from '@n8n/di';

import type { SimulationBackend } from './tool-simulation.contracts';

/** Backend for test runs, registered by another module. Without one, simulated calls are blocked. */
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
