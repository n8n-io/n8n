import { ModuleRegistry } from '@n8n/backend-common';
import { WorkflowEngineDefaultProviderProxy } from '@n8n/backend-services';
import { EngineConfig, type EngineDefaultType } from '@n8n/config';
import { Service } from '@n8n/di';
import type { IWorkflowSettings } from 'n8n-workflow';

/**
 * Puts a new workflow on engine v2 when the instance runs new workflows on v2 and the
 * creator did not choose an engine. A workflow without an engine runs on v1, so v1 is
 * never written.
 */
@Service()
export class WorkflowEngineDefaults {
	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly defaultProvider: WorkflowEngineDefaultProviderProxy,
	) {}

	/**
	 * Without the `engine-v2` module, new workflows run on v1. Otherwise the environment
	 * variable wins, then the value a module stores, then v1.
	 */
	async resolveDefault(): Promise<EngineDefaultType> {
		// Read at call time: modules become active after services are constructed.
		if (!this.moduleRegistry.isActive('engine-v2')) return 'v1';
		if (this.engineConfig.defaultTypeSetByEnv) return this.engineConfig.defaultType;

		return (await this.defaultProvider.getDefaultEngine()) ?? 'v1';
	}

	applyTo(settings: IWorkflowSettings, defaultEngine: EngineDefaultType): IWorkflowSettings;
	applyTo(
		settings: IWorkflowSettings | undefined,
		defaultEngine: EngineDefaultType,
	): IWorkflowSettings | undefined;
	applyTo(
		settings: IWorkflowSettings | undefined,
		defaultEngine: EngineDefaultType,
	): IWorkflowSettings | undefined {
		if (settings?.engineType !== undefined || defaultEngine !== 'v2') return settings;

		return { ...(settings ?? {}), engineType: 'v2' };
	}
}
