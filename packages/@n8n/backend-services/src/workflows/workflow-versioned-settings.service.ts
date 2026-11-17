import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	applyVersionedSettings,
	pickVersionedSettings,
	type IWorkflowSettings,
} from 'n8n-workflow';

/**
 * Version-scoped workflow settings, such as the engine, are saved with each
 * version and go live when the version is published. Only the `engine-v2`
 * module turns this on. Without it, every setting applies at once, as before.
 */
@Service()
export class WorkflowVersionedSettingsService {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	// Read the module config, not the active modules: the module starts only on main,
	// but webhook and worker instances also run published versions.
	isEnabled(): boolean {
		return this.moduleRegistry.eligibleModules.includes('engine-v2');
	}

	/**
	 * The settings of a production run: the live settings of the workflow, and
	 * the version-scoped settings of the published version. Every path that runs
	 * the published version uses this, so production never runs the draft engine.
	 * A version saved before history stored settings has no engine and runs on v1.
	 */
	forPublishedRun(
		workflowSettings: IWorkflowSettings | undefined,
		publishedVersion: { settings?: IWorkflowSettings },
	): IWorkflowSettings | undefined {
		if (!this.isEnabled()) return workflowSettings;

		return applyVersionedSettings(
			workflowSettings,
			pickVersionedSettings(publishedVersion.settings),
		);
	}
}
