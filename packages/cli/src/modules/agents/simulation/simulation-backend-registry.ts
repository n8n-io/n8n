import { Service } from '@n8n/di';

import type {
	OpenWorldInput,
	SimulatedAgent,
	SimulationBackend,
} from './tool-simulation.contracts';

/**
 * Stands in for the Linear fixture backend. It loads the backend module on the first call, so an
 * instance without the opt-in never loads that module or the MCP guard.
 */
class LazyLinearGymBackend implements SimulationBackend {
	readonly id = 'shared-simulation-layer';

	/** The same value as the loaded backend. The session reads it before each turn. */
	readonly worldDependsOnDraftConnections = true;

	private loaded: SimulationBackend | undefined;

	private async load(): Promise<SimulationBackend> {
		if (this.loaded) return this.loaded;
		const { LinearGymBackend } = await import('./linear-gym-backend.js');
		// Two first calls can overlap. They must get the same backend.
		return (this.loaded ??= new LinearGymBackend());
	}

	async describeTools(agent: SimulatedAgent) {
		return await (await this.load()).describeTools(agent);
	}

	async openWorld(input: OpenWorldInput) {
		return await (await this.load()).openWorld(input);
	}
}

/**
 * Backend for test runs, registered by another module. Without one, simulated calls are blocked.
 * `N8N_SAFE_TESTING_BACKEND=linear-gym` selects the local Linear fixture backend instead.
 */
@Service()
export class SimulationBackendRegistry {
	private linearGym: SimulationBackend | undefined;

	private backend: SimulationBackend | undefined;

	register(backend: SimulationBackend): void {
		this.backend = backend;
	}

	get(): SimulationBackend | undefined {
		if (process.env.N8N_SAFE_TESTING_BACKEND !== 'linear-gym') return this.backend;
		this.linearGym ??= new LazyLinearGymBackend();
		return this.linearGym;
	}
}
