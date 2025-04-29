import { Container, Service, type Constructable } from '@n8n/di';
import type {
	IDataObject,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
	IWorkflowBase,
	Workflow,
} from 'n8n-workflow';

import type { LifecycleContext } from './lifecycle-metadata';
import { LifecycleMetadata } from './lifecycle-metadata';

export interface BaseN8nModule {
	initialize?(): void;
}

type Module = Constructable<BaseN8nModule>;

export const registry = new Set<Module>();

export const N8nModule = (): ClassDecorator => (target) => {
	registry.add(target as unknown as Module);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Service()(target);
};

interface ExecutionLifecycleHooks {
	addHandler<
		Hook extends
			| 'nodeExecuteBefore'
			| 'nodeExecuteAfter'
			| 'workflowExecuteBefore'
			| 'workflowExecuteAfter',
		// eslint-disable-next-line @typescript-eslint/ban-types
	>(hookName: Hook, ...handlers: Function[]): void;
}

@Service()
export class ModuleRegistry {
	initializeModules() {
		for (const ModuleClass of registry.keys()) {
			const instance = Container.get(ModuleClass);
			if (instance.initialize) {
				instance.initialize();
			}
		}
	}

	registerLifecycleHooks(hooks: ExecutionLifecycleHooks) {
		const handlers = Container.get(LifecycleMetadata).getHandlers();

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
							return await instance[methodName].call(instance, context);
						},
					);
					break;
			}
		}
	}
}
