import { UnexpectedError } from 'n8n-workflow';

export class UnknownModuleError extends UnexpectedError {
	constructor(moduleName: string) {
		super(
			`Found unknown internal module "${moduleName}" in \`N8N_ENABLED_MODULES\` or \`N8N_DISABLED_MODULES\`. Please review your environment variables, or ensure your internal module is in the \`MODULE_NAMES\` constant.`,
		);
	}
}
