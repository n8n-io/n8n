import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { WorkflowAuthoringChecksProxy } from '@/workflows/authoring-checks-proxy.service';

@BackendModule({ name: 'workflow-authoring-checks', instanceTypes: ['main'] })
export class WorkflowAuthoringChecksModule implements ModuleInterface {
	async init() {
		await import('./workflow-authoring-checks.controller');

		const { WorkflowCheckRegistry } = await import('./workflow-check-registry.service');
		const { WorkflowAuthoringChecksService } = await import('./workflow-authoring-checks.service');
		const { AiAgentRequiresGuardrailCheck } = await import(
			'./checks/ai-agent-requires-guardrail.check'
		);

		Container.get(WorkflowCheckRegistry).register(Container.get(AiAgentRequiresGuardrailCheck));

		Container.get(WorkflowAuthoringChecksProxy).setInner(
			Container.get(WorkflowAuthoringChecksService),
		);
	}

	async entities() {
		const { WorkflowCheckConfig } = await import(
			'./database/entities/workflow-check-config.entity'
		);
		return [WorkflowCheckConfig] as never;
	}
}
