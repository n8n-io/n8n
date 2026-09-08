import { UserError } from 'n8n-workflow';

export class PackagedModuleLoadError extends UserError {
	constructor(moduleName: string, errorMsg: string) {
		super(
			`Failed to load module "${moduleName}" from its workspace package: ${errorMsg}. Please review the module's entry in n8n's "src/modules/modules.manifest.ts", and confirm the module's package is a declared dependency of n8n.`,
		);
	}
}
