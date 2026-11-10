import type { IWorkflowSettings } from 'n8n-workflow';

import type { EngineV2Reason } from './types';

/**
 * True when the setting names a concrete workflow. The runtime never evaluates an
 * expression in this setting, so v1 runs no error workflow for one either.
 */
function namesErrorWorkflow(errorWorkflow: IWorkflowSettings['errorWorkflow']): boolean {
	return (
		typeof errorWorkflow === 'string' &&
		errorWorkflow !== '' &&
		errorWorkflow !== 'DEFAULT' &&
		!errorWorkflow.startsWith('=')
	);
}

/** Settings that engine v2 ignores. Running anyway would silently drop what the user asked for. */
export function findSettingsReasons(settings: IWorkflowSettings = {}): EngineV2Reason[] {
	const reasons: EngineV2Reason[] = [];

	if (namesErrorWorkflow(settings.errorWorkflow)) {
		reasons.push({
			code: 'error-workflow',
			severity: 'blocking',
			message: 'Engine v2 does not run an error workflow yet. Remove the error workflow setting.',
		});
	}

	if (settings.redactionPolicy !== undefined && settings.redactionPolicy !== 'none') {
		reasons.push({
			code: 'redaction-policy',
			severity: 'blocking',
			message: 'Engine v2 does not redact execution data yet. Set the redaction policy to none.',
		});
	}

	if (settings.credentialResolverId) {
		reasons.push({
			code: 'end-user-credentials',
			severity: 'blocking',
			message:
				'Engine v2 does not support end-user credentials yet. Remove the credential resolver.',
		});
	}

	return reasons;
}
