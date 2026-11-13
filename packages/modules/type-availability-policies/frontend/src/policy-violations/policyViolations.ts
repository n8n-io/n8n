import { policyViolationSchema, type PolicyViolation } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

const violationsSchema = policyViolationSchema.array().nonempty();

/**
 * What `PolicyViolationList` shows. A server violation fits as it is, and the editor can list
 * what it found itself without a `checkId` or a message of its own.
 */
export type PolicyViolationListItem = Pick<
	PolicyViolation,
	'kind' | 'subject' | 'subjectType' | 'scope'
> & { message?: string };

/**
 * A refused request carries the violations under `meta`, but a refused manual run is stored on
 * the execution error, where only the own properties of the error survive.
 */
function readViolations(error: unknown): unknown {
	if (!isRecord(error)) return undefined;
	if (isRecord(error.meta) && error.meta.violations !== undefined) return error.meta.violations;
	return error.violations;
}

export function getPolicyViolations(error: unknown): PolicyViolation[] | undefined {
	const parsed = violationsSchema.safeParse(readViolations(error));
	return parsed.success ? parsed.data : undefined;
}
