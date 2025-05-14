import { UnexpectedError } from 'n8n-workflow';

export class ModuleLoadingMismatchError extends UnexpectedError {
	constructor(moduleNames: string[]) {
		const sentenceStart = moduleNames.length > 1 ? 'Modules are' : 'A module is';

		super(
			`${sentenceStart} listed in both \`N8N_ENABLED_MODULES\` and \`N8N_DISABLED_MODULES\`: ${moduleNames.join(', ')}. Please review these environment variables, as a module cannot be both enabled and disabled.`,
			{ level: 'fatal' },
		);
	}
}
