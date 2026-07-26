export type RefusalReason = 'sensitive_context' | 'probe_failed';

export interface SensitivityRefusal {
	ok: false;
	reason: RefusalReason;
	hint: string;
}
