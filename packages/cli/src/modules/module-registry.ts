import type { LifecycleContext } from '@n8n/decorators';
import { LifecycleMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { Logger } from 'n8n-core';
import type {
	IDataObject,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
	IWorkflowBase,
	Workflow,
} from 'n8n-workflow';
import assert from 'node:assert';

@Service()
export class ModuleRegistry {
	constructor(
		private readonly moduleMetadata: ModuleMetadata,
		private readonly lifecycleMetadata: LifecycleMetadata,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('modules');
	}

	private readonly activated = new Set<string>();

	isActive(moduleName: string) {
		return this.activated.has(moduleName);
	}

	/** Activate all modules whose classes were loaded in memory via `ModuleLoader.loadModules()`. */
	async activateModules() {
		for (const [moduleName, ModuleClass] of this.moduleMetadata.getModules()) {
			try {
				await Container.get(ModuleClass).activate?.();
				this.activated.add(moduleName);
			} catch (error) {
				assert(error instanceof Error);
				this.logger.error(`Failed to init module "${moduleName}"`, { error });
			}
		}

		const moduleNames = Array.from(this.activated);

		this.logger.info(`Modules initialized: ${moduleNames.join(', ')}`, { moduleNames });
	}

	registerLifecycleHooks(hooks: ExecutionLifecycleHooks) {
		const handlers = this.lifecycleMetadata.getHandlers();

		for (const { handlerClass, methodName, eventName } of handlers) {
			const instance = Container.get(handlerClass);

			switch (eventName) {
				case 'workflowExecuteAfter':
					hooks.addHandler(
						eventName,
						async function (
							this: { workflowData: IWorkflowBase },
							runData: IRun,
							newStaticData: IDataObject,
						) {
							const context: LifecycleContext = {
								type: 'workflowExecuteAfter',
								workflow: this.workflowData,
								runData,
								newStaticData,
							};
							// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/return-await
							return await instance[methodName].call(instance, context);
						},
					);
					break;

				case 'nodeExecuteBefore':
					hooks.addHandler(
						eventName,
						async function (
							this: { workflowData: IWorkflowBase },
							nodeName: string,
							taskData: ITaskStartedData,
						) {
							const context: LifecycleContext = {
								type: 'nodeExecuteBefore',
								workflow: this.workflowData,
								nodeName,
								taskData,
							};

							// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/return-await
							return await instance[methodName].call(instance, context);
						},
					);
					break;

				case 'nodeExecuteAfter':
					hooks.addHandler(
						eventName,
						async function (
							this: { workflowData: IWorkflowBase },
							nodeName: string,
							taskData: ITaskData,
							executionData: IRunExecutionData,
						) {
							const context: LifecycleContext = {
								type: 'nodeExecuteAfter',
								workflow: this.workflowData,
								nodeName,
								taskData,
								executionData,
							};

							// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/return-await
							return await instance[methodName].call(instance, context);
						},
					);
					break;

				case 'workflowExecuteBefore':
					hooks.addHandler(
						eventName,
						async function (
							this: { workflowData: IWorkflowBase },
							workflowInstance: Workflow,
							executionData?: IRunExecutionData,
						) {
							const context: LifecycleContext = {
								type: 'workflowExecuteBefore',
								workflow: this.workflowData,
								workflowInstance,
								executionData,
							};

							// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/return-await
							return await instance[methodName].call(instance, context);
						},
					);
					break;
			}
		}
	}
}
