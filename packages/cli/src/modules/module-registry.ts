import { LicenseState, Logger } from '@n8n/backend-common';
import { LifecycleMetadata, ModuleMetadata } from '@n8n/decorators';
import type { LifecycleContext, EntityClass, ModuleSettings } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import {
	UserError,
	type IDataObject,
	type IRun,
	type IRunExecutionData,
	type ITaskData,
	type ITaskStartedData,
	type IWorkflowBase,
	type Workflow,
} from 'n8n-workflow';

class DuplicateModuleNameError extends UserError {
	constructor(moduleName: string) {
		super(
			`Module "${moduleName}" exists more than once. Please ensure all your module classes are uniquely named.`,
		);
	}
}

@Service()
export class ModuleRegistry {
	readonly entities: EntityClass[] = [];

	readonly settings: Map<string, ModuleSettings> = new Map();

	constructor(
		private readonly moduleMetadata: ModuleMetadata,
		private readonly lifecycleMetadata: LifecycleMetadata,
		private readonly licenseState: LicenseState,
		private readonly logger: Logger,
	) {}

	async initModules() {
		for (const [moduleName, moduleEntry] of this.moduleMetadata.getEntries()) {
			const { licenseFlag, class: ModuleClass } = moduleEntry;

			if (licenseFlag && !this.licenseState.isLicensed(licenseFlag)) {
				this.logger.debug(`Skipped init for unlicensed module "${ModuleClass.name}"`);
				continue;
			}
			const moduleSettings = await Container.get(ModuleClass).init?.();

			if (!moduleSettings) continue;

			if (this.settings.has(moduleName)) throw new DuplicateModuleNameError(moduleName);

			this.settings.set(moduleName, moduleSettings);
		}
	}

	addEntities() {
		for (const [_, moduleEntry] of this.moduleMetadata.getEntries()) {
			const { class: ModuleClass } = moduleEntry;

			const entities = Container.get(ModuleClass).entities?.();

			if (!entities || entities.length === 0) continue;

			this.entities.push(...entities);
		}
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
