import { BUILDER_NOT_CONFIGURED_CODE } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';

/**
 * Stable code on `BuilderNotConfiguredError` so the SSE stream / FE can
 * detect the unconfigured state and render the "go to settings" empty
 * state without parsing the human-readable message.
 *
 * Re-exported from `@n8n/api-types` (the canonical source) so existing cli
 * imports of this module keep working.
 */
export { BUILDER_NOT_CONFIGURED_CODE };

export class BuilderNotConfiguredError extends UserError {
	readonly code = BUILDER_NOT_CONFIGURED_CODE;

	constructor() {
		super(
			'Agent builder is not configured. An admin must select a provider and credential, or configure the n8n AI assistant proxy.',
		);
	}
}
