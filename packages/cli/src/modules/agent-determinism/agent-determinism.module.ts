import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'agent-determinism', instanceTypes: ['main'] })
export class AgentDeterminismModule implements ModuleInterface {
	async init() {
		await import('./agent-determinism.controller.js');

		const { RunClusterer, RunCollector, WorkflowTranslator } = await import(
			'./agent-determinism.contracts.js'
		);
		const { TraceRunClusterer } = await import('./trace-run-clusterer.js');
		const { TraceRunCollector } = await import('./trace-run-collector.js');
		const { TraceWorkflowTranslator } = await import('./trace-workflow-translator.js');
		if (!Container.has(RunCollector)) Container.set(RunCollector, Container.get(TraceRunCollector));
		if (!Container.has(RunClusterer)) Container.set(RunClusterer, Container.get(TraceRunClusterer));
		if (!Container.has(WorkflowTranslator)) {
			Container.set(WorkflowTranslator, Container.get(TraceWorkflowTranslator));
		}

		const { DeterminismSourceRepository } = await import(
			'./database/determinism-source.repository.js'
		);
		await Container.get(DeterminismSourceRepository).resetInterrupted();

		const { AgentDeterminismListener } = await import('./agent-determinism.listener.js');
		Container.get(AgentDeterminismListener).init();
	}

	async entities() {
		const { DeterminismSourceEntity } = await import('./database/determinism-source.entity.js');
		return [DeterminismSourceEntity];
	}
}
