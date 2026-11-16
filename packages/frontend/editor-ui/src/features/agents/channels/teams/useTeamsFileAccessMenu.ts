import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

/**
 * "Approve now" or "Copy link for admin": the person setting this up is often
 * not the administrator who approves it.
 */
export function useTeamsFileAccessMenu(options: {
	url: MaybeRefOrGetter<string>;
	organization: MaybeRefOrGetter<string>;
	/** Microsoft returns to the agent page, which reopens the settings but not the setup. */
	openInPlace?: MaybeRefOrGetter<boolean>;
}) {
	const i18n = useI18n();
	const clipboard = useClipboard();
	const toast = useToast();

	const organization = computed(() => toValue(options.organization));

	const items = computed(() => [
		{
			id: 'approve',
			testId: 'teams-file-access-approve',
			label: i18n.baseText('agents.channels.teams.managed.fileAccess.approveNow'),
			description: organization.value
				? i18n.baseText('agents.channels.teams.managed.fileAccess.approveNowHint', {
						interpolate: { organization: organization.value },
					})
				: i18n.baseText('agents.channels.teams.managed.fileAccess.approveNowHintNoOrganization'),
		},
		{
			id: 'copy',
			testId: 'teams-file-access-copy',
			label: i18n.baseText('agents.channels.teams.managed.fileAccess.copyLink'),
			description: i18n.baseText('agents.channels.teams.managed.fileAccess.copyLinkHint'),
		},
	]);

	async function onSelect(id: string) {
		const url = toValue(options.url);
		if (!url) return;
		if (id === 'approve') {
			if (toValue(options.openInPlace)) window.location.assign(url);
			else window.open(url, '_blank', 'noopener');
			return;
		}
		await clipboard.copy(url);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('agents.channels.teams.managed.fileAccess.copied'),
			message: organization.value
				? i18n.baseText('agents.channels.teams.managed.fileAccess.copiedHint', {
						interpolate: { organization: organization.value },
					})
				: i18n.baseText('agents.channels.teams.managed.fileAccess.copyLinkHint'),
		});
	}

	return { items, onSelect };
}
