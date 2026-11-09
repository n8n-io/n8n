import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Agent-scoped evaluations: runs eval datasets against a real agent, persists
 * per-case results, and serves the REST surface the editor consumes.
 *
 * Main-process only — the reused tool-mock substrate can't cross a queue
 * boundary. Loaded by default; `101_agent_evals` gates access for each user.
 */
@BackendModule({ name: 'agent-evals', instanceTypes: ['main'] })
export class AgentEvalsModule implements ModuleInterface {
	async init() {
		await import('./agent-evals.controller.js');

		const { AgentEvalRunnerService } = await import('./agent-eval-runner.service.js');
		const runner = Container.get(AgentEvalRunnerService);
		// The runner can't resume runs interrupted by a restart — sweep any left
		// over from a previous process so they don't poll as `running` forever.
		await runner.cleanupInterruptedRuns();

		// The code checks on live sessions run after each run of a published
		// agent finishes. They call no model.
		const { ModuleRegistry } = await import('@n8n/backend-common');
		if (Container.get(ModuleRegistry).isActive('agents')) {
			const { AgentExecutionService } = await import('../agents/agent-execution.service.js');
			const { AgentLiveChecksService } = await import(
				'./online-checks/agent-live-checks.service.js'
			);
			const liveChecks = Container.get(AgentLiveChecksService);
			Container.get(AgentExecutionService).onExecutionFinished(
				async (execution) => await liveChecks.checkFinishedExecution(execution),
			);
		}
	}
}
