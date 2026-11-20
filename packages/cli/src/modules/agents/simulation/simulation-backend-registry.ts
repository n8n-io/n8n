import { Service } from '@n8n/di';

import { LinearGymBackend } from './linear-gym-backend';
import type { SimulationBackend } from './tool-simulation.contracts';

/** Backend for test runs, registered by another module. Without one, simulated calls are blocked. */
@Service()
export class SimulationBackendRegistry {
	private readonly fixture = new LinearGymBackend();

	private backend: SimulationBackend | undefined;

	register(backend: SimulationBackend): void {
		this.backend = backend;
	}

	get(): SimulationBackend | undefined {
		return process.env.N8N_SAFE_TESTING_BACKEND === 'linear-gym' ? this.fixture : this.backend;
	}
}
