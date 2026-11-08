import { UserError } from 'n8n-workflow';

/**
 * The module's entrypoint was found but could not be evaluated, e.g. because one
 * of its dependencies is not installed. Distinct from `MissingModuleError`, which
 * means the entrypoint file itself is absent.
 */
export class ModuleLoadError extends UserError {
	constructor(moduleName: string, cause: unknown) {
		super(
			`Failed to load module "${moduleName}": ${cause instanceof Error ? cause.message : String(cause)}. The module's entrypoint was found but could not be loaded. Please review the module's dependencies.`,
			{ cause },
		);
	}
}
