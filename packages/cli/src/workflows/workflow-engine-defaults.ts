import { ModuleRegistry } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { IWorkflowSettings, WorkflowEngineType } from 'n8n-workflow';

/** The workflow engine setup of the instance. */
export interface WorkflowEngineSetup {
	/** True when the `engine-v2` module is active. */
	engineV2Available: boolean;
	/** The engine that a new workflow gets when its creator does not choose one. */
	newWorkflowEngine: WorkflowEngineType;
}

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
	) {}

	applyTo(settings: IWorkflowSettings): IWorkflowSettings;
	applyTo(settings: IWorkflowSettings | undefined): IWorkflowSettings | undefined;
	applyTo(settings: IWorkflowSettings | undefined): IWorkflowSettings | undefined {
		if (settings?.engineType !== undefined || !this.runsNewWorkflowsOnV2()) return settings;

		return { ...(settings ?? {}), engineType: 'v2' };
	}

	// Read at call time: modules become active after services are constructed.
	getSetup(): WorkflowEngineSetup {
		const engineV2Available = this.moduleRegistry.isActive('engine-v2');
		return {
			engineV2Available,
			newWorkflowEngine: engineV2Available && this.engineConfig.defaultType === 'v2' ? 'v2' : 'v1',
		};
	}

	private runsNewWorkflowsOnV2() {
		return this.getSetup().newWorkflowEngine === 'v2';
	}
}
