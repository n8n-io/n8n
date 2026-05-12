export const N8N_ENV_FEAT_REDACTION_ENFORCEMENT = 'N8N_ENV_FEAT_REDACTION_ENFORCEMENT';

export function isRedactionEnforcementEnabled(): boolean {
	return process.env[N8N_ENV_FEAT_REDACTION_ENFORCEMENT] === 'true';
}
