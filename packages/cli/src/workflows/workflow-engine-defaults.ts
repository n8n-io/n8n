import { ModuleRegistry } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { IWorkflowSettings } from 'n8n-workflow';

/**
 * Gives a new workflow an explicit engine when its creator did not choose one.
 * Engine v2 runs only with the `engine-v2` module, so without it the default is v1.
 */
@Service()
export class WorkflowEngineDefaults {
	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	applyTo(settings: IWorkflowSettings | undefined): IWorkflowSettings {
		if (settings?.engineType !== undefined) return settings;

		return { ...(settings ?? {}), engineType: this.resolveDefault() };
	}

	// Read at call time: modules become active after services are constructed.
	private resolveDefault(): NonNullable<IWorkflowSettings['engineType']> {
		return this.engineConfig.defaultType === 'v2' && this.moduleRegistry.isActive('engine-v2')
			? 'v2'
			: 'v1';
	}
}
