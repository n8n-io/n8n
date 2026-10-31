import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { applyVersionedSettings, type IWorkflowSettings } from 'n8n-workflow';

/**
 * Version-scoped workflow settings, such as the engine, are saved with each
 * version and go live when the version is published. Only the `engine-v2`
 * module turns this on. Without it, every setting applies at once, as before.
 */
@Service()
export class WorkflowVersionedSettings {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	// Read at call time: modules become active after services are constructed.
	isEnabled(): boolean {
		return this.moduleRegistry.isActive('engine-v2');
	}

	/**
	 * The settings of a production run: the live settings of the workflow, and
	 * the version-scoped settings of the published version. Every path that runs
	 * the published version uses this, so production never runs the draft engine.
	 */
	forPublishedRun(
		workflowSettings: IWorkflowSettings | undefined,
		publishedVersion: { settings?: IWorkflowSettings | null },
	): IWorkflowSettings | undefined {
		if (!this.isEnabled()) return workflowSettings;

		return applyVersionedSettings(workflowSettings, publishedVersion.settings);
	}
}
