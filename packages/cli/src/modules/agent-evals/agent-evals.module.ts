import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Agent-scoped evaluations. Runs eval datasets against a real agent and
 * persists per-case results. Main-process only — the reused tool-mock substrate
 * cannot cross a queue boundary. Opt-in (not a default module) and dark until
 * the `101_agent_evals` flag is on; the persistence layer lives in `@n8n/db`.
 */
@BackendModule({ name: 'agent-evals', instanceTypes: ['main'] })
export class AgentEvalsModule implements ModuleInterface {
	async init() {
		const { AgentEvalRunnerService } = await import('./agent-eval-runner.service.js');
		const runner = Container.get(AgentEvalRunnerService);
		// The runner can't resume runs interrupted by a restart — sweep any left
		// over from a previous process so they don't poll as `running` forever.
		await runner.cleanupInterruptedRuns();
	}
}
