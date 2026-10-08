import type {
	DomainAccessAction,
	InstanceAiApprovalResumeData,
	InstanceGatewayResourceDecision,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

type ApprovalScope = NonNullable<InstanceAiApprovalResumeData['scope']>;

interface StandingChoice<T extends string> {
	key: string;
	always: readonly T[];
	once: T;
}

/** The answer fields that store a grant for the rest of the thread, and their one-time value. */
const STANDING_CHOICES: readonly StandingChoice<string>[] = [
	{ key: 'scope', always: ['session'], once: 'once' } satisfies StandingChoice<ApprovalScope>,
	{
		key: 'domainAccessAction',
		always: ['allow_domain', 'allow_all'],
		once: 'allow_once',
	} satisfies StandingChoice<DomainAccessAction>,
	{
		key: 'resourceDecision',
		always: ['allowForSession'],
		once: 'allowOnce',
	} satisfies StandingChoice<InstanceGatewayResourceDecision>,
];

/**
 * Turns "always allow" into "allow once" in the answer of a user who does not own the
 * thread. An "always" grant applies to every later turn of the owner, so only the owner
 * can give it. Works on the card body and on raw resume data, which use the same keys.
 */
export function withoutStandingApproval(resumeData: unknown): unknown {
	if (!isRecord(resumeData)) return resumeData;
	const answer: Record<string, unknown> = { ...resumeData };
	for (const { key, always, once } of STANDING_CHOICES) {
		const value = answer[key];
		if (always.some((choice) => choice === value)) answer[key] = once;
	}
	return answer;
}
