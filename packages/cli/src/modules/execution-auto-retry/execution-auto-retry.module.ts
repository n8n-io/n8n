import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'execution-auto-retry', instanceTypes: ['main'] })
export class ExecutionAutoRetryModule implements ModuleInterface {
	async init() {
		await import('./execution-auto-retry.service.js');

		const { ExecutionAutoRetryTaskHandler } = await import(
			'./execution-auto-retry.task-handler.js'
		);
		const { DurableScheduler } = await import('@/scheduling/durable-scheduler.js');
		const handler = Container.get(ExecutionAutoRetryTaskHandler);
		Container.get(DurableScheduler).registerTaskHandler(handler.taskType, handler);
	}
}
