import { useI18n } from '@n8n/i18n';
import type { AnswerAuthorship, SharedRowLabel } from './sharingView';

/**
 * The texts of shared chats. The server sends an empty name when it cannot find the user or
 * the project, so the texts fall back to "the owner" and "this project".
 */
export function useSharingText() {
	const i18n = useI18n();

	const owner = (name: string) => name || i18n.baseText('instanceAi.sharing.theOwner');
	const project = (name: string) => name || i18n.baseText('instanceAi.sharing.thisProject');

	function answerAuthorship({ decision, name }: AnswerAuthorship): string {
		if (name === undefined) {
			return i18n.baseText(
				decision === 'approved'
					? 'instanceAi.sharing.approvedByYou'
					: 'instanceAi.sharing.declinedByYou',
			);
		}
		return i18n.baseText(
			decision === 'approved' ? 'instanceAi.sharing.approvedBy' : 'instanceAi.sharing.declinedBy',
			{ interpolate: { name } },
		);
	}

	function alreadyAnswered(name: string | undefined): string {
		return name
			? i18n.baseText('instanceAi.sharing.alreadyAnsweredBy', { interpolate: { name } })
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
