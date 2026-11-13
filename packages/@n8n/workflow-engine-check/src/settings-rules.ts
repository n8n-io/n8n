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

/** Settings that engine v2 ignores or does not fully support yet. */
export function findSettingsReasons(settings: IWorkflowSettings): EngineV2Reason[] {
	const reasons: EngineV2Reason[] = [];

	if (namesErrorWorkflow(settings.errorWorkflow)) {
		reasons.push({
			code: 'ERROR_WORKFLOW',
			severity: 'blocking',
			message: 'Engine v2 does not run an error workflow yet. Remove the error workflow setting.',
		});
	}

	if ((settings.redactionPolicy ?? 'none') !== 'none') {
		reasons.push({
			code: 'REDACTION_POLICY',
			severity: 'warning',
			message:
				'Engine v2 is not fully tested with data redaction yet. Some execution data may not be redacted as expected.',
		});
	}

	if (settings.credentialResolverId) {
		reasons.push({
			code: 'END_USER_CREDENTIALS',
			severity: 'blocking',
			message:
				'Engine v2 does not support end-user credentials yet. Remove the credential resolver.',
		});
	}

	return reasons;
}
