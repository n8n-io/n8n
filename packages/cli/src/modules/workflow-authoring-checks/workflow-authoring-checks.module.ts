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
		const { NodeHasDirectParentCheck } = await import('./checks/node-has-direct-parent.check');
		const { NoDanglingNodesCheck } = await import('./checks/no-dangling-nodes.check');

		const registry = Container.get(WorkflowCheckRegistry);
		registry.register(Container.get(NodeHasDirectParentCheck));
		registry.register(Container.get(NoDanglingNodesCheck));

		const service = Container.get(WorkflowAuthoringChecksService);
		await service.ensureStaticInstances();

		Container.get(WorkflowAuthoringChecksProxy).setInner(service);
	}

	async entities() {
		const { WorkflowCheck } = await import('./database/entities/workflow-check.entity');
		return [WorkflowCheck] as never;
	}
}
