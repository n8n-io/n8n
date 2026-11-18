import { PUBLISH_JUDGE_VIOLATION_KIND, type PolicyViolation } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import { useInstanceAiReady } from './useInstanceAiAvailability';
import {
	ensureThreadProjectId,
	useInstanceAiHandoff,
	type InstanceAiHandoffOutcome,
} from './useInstanceAiHandoff';

/** What the judge refused. `projectId` is the project that owns it. */
export type JudgeRefusedSubject =
	| { type: 'workflow'; id: string; name?: string; projectId?: string }
	| { type: 'agent'; id: string; name?: string; projectId: string };

/** A judge that gave no answer leaves nothing to change, so only its refusals count. */
function refusalsOf(violations: PolicyViolation[]): PolicyViolation[] {
	return violations.filter(({ kind }) => kind === PUBLISH_JUDGE_VIOLATION_KIND.denied);
}

/** Hands a judge refusal to the n8n Assistant, which changes the workflow or the agent. */
export function usePublishJudgeFix() {
	const ready = useInstanceAiReady();
	const { startThread } = useInstanceAiHandoff();
	const i18n = useI18n();

	function canFix(violations: PolicyViolation[]): boolean {
		return refusalsOf(violations).length > 0 && ready.value;
	}

	function requestFor(subject: JudgeRefusedSubject, refusals: PolicyViolation[]): string {
		const interpolate = { name: subject.name ?? '', id: subject.id };
		return [
			i18n.baseText(`publishJudge.fix.request.intro.${subject.type}`, { interpolate }),
			refusals.map(({ message }) => `- ${message}`).join('\n'),
			i18n.baseText(`publishJudge.fix.request.steps.${subject.type}`),
		].join('\n\n');
	}

	async function fix(
		subject: JudgeRefusedSubject,
		violations: PolicyViolation[],
	): Promise<InstanceAiHandoffOutcome> {
		const projectId = await ensureThreadProjectId(subject.projectId);
		if (!projectId) return 'failed';

		const { id, name } = subject;
		return await startThread(
			projectId,
			requestFor(subject, refusalsOf(violations)),
			{ kind: 'prefill', prefillType: 'handoff_publish_judge_fix' },
			{ source: 'publish_judge_refusal', origin: 'internal' },
			[
				subject.type === 'workflow'
					? { type: 'workflow', id, name }
					: { type: 'agent', id, name, projectId: subject.projectId },
			],
		);
	}

	return { canFix, fix };
}
