import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'agent-determinism', instanceTypes: ['main'] })
export class AgentDeterminismModule implements ModuleInterface {
	async init() {
		const { RunClusterer, RunCollector, WorkflowTranslator } = await import(
			'./agent-determinism.contracts.js'
		);
		const { ToolSequenceClusterer } = await import('./tool-sequence-clusterer.js');
		const { StubRunCollector } = await import('./stub-run-collector.js');
		const { StubWorkflowTranslator } = await import('./stub-workflow-translator.js');
		if (!Container.has(RunCollector)) Container.set(RunCollector, Container.get(StubRunCollector));
		if (!Container.has(RunClusterer)) {
			Container.set(RunClusterer, Container.get(ToolSequenceClusterer));
		}
		if (!Container.has(WorkflowTranslator)) {
			Container.set(WorkflowTranslator, Container.get(StubWorkflowTranslator));
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
