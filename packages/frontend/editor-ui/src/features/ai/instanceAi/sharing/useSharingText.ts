import { type BaseTextKey, useI18n } from '@n8n/i18n';
import type {
	AnswerAuthorship,
	AnswerDecision,
	ResumeFailureNotice,
	SharedRowLabel,
} from './sharingView';

type AnsweredNotice = Exclude<ResumeFailureNotice, { kind: 'refused' }>;

/** The tool-step note of an answer: by another user (`other`), or by the viewer (`self`). */
const AUTHORSHIP_KEYS = {
	approved: { other: 'instanceAi.sharing.approvedBy', self: 'instanceAi.sharing.approvedByYou' },
	declined: { other: 'instanceAi.sharing.declinedBy', self: 'instanceAi.sharing.declinedByYou' },
	answered: { other: 'instanceAi.sharing.answeredBy', self: 'instanceAi.sharing.answeredByYou' },
} as const satisfies Record<AnswerDecision, { other: BaseTextKey; self: BaseTextKey }>;

/**
 * The texts of shared chats. The server sends an empty name when it cannot find the user or
 * the project, so the texts fall back to "the owner" and "this project".
 */
export function useSharingText() {
	const i18n = useI18n();

	const owner = (name: string) => name || i18n.baseText('instanceAi.sharing.theOwner');
	const project = (name: string) => name || i18n.baseText('instanceAi.sharing.thisProject');

	function answerAuthorship({ decision, name }: AnswerAuthorship): string {
		const keys = AUTHORSHIP_KEYS[decision];
		return name === undefined
			? i18n.baseText(keys.self)
			: i18n.baseText(keys.other, { interpolate: { name } });
	}

	/** The message for a card that was already answered when the viewer's answer arrived. */
	function alreadyAnswered(notice: AnsweredNotice): string {
		if (notice.kind === 'answered-by-you') {
			return i18n.baseText('instanceAi.sharing.alreadyAnsweredByYou');
		}
		return notice.name
			? i18n.baseText('instanceAi.sharing.alreadyAnsweredBy', {
					interpolate: { name: notice.name },
				})
			: i18n.baseText('instanceAi.sharing.alreadyAnswered');
	}

	function sharedRowLabel(label: SharedRowLabel): string {
		return label.kind === 'shared-by'
			? i18n.baseText('instanceAi.sharing.sharedBy', { interpolate: { owner: owner(label.name) } })
			: i18n.baseText('instanceAi.sharing.sharedWith', {
					interpolate: { project: project(label.name) },
				});
	}

	return { owner, project, answerAuthorship, alreadyAnswered, sharedRowLabel };
}
