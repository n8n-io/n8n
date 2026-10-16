import { useI18n } from '@n8n/i18n';

import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';

/** Setting up again takes the agent offline in Teams until the new setup is done. */
export function useTeamsSetupRestart() {
	const i18n = useI18n();
	const message = useMessage();

	async function confirmRestart() {
		const confirmed = await message.confirm(
			i18n.baseText('agents.channels.teams.restart.confirmMessage'),
			i18n.baseText('agents.channels.teams.restart.confirmTitle'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('agents.channels.teams.restart.button'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		return confirmed === MODAL_CONFIRM;
	}

	return { confirmRestart };
}
