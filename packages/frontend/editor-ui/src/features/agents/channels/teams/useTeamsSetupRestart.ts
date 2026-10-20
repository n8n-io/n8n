import { useI18n } from '@n8n/i18n';
import { watch, type Ref } from 'vue';

import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';

import type { AgentChannelRestart } from '../types';

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

	/**
	 * Another credential is another bot, which needs its own check and Azure Bot,
	 * so it cannot be swapped in: the picker keeps the saved one, and the user
	 * sets the channel up again instead.
	 */
	function restartOnCredentialChange(
		credentialId: Ref<string>,
		savedCredentialId: () => string,
		restart: (restart: AgentChannelRestart) => void,
	) {
		watch(credentialId, async (next) => {
			const saved = savedCredentialId();
			if (!saved || !next || next === saved) return;
			credentialId.value = saved;
			if (await confirmRestart()) restart({ credentialId: next });
		});
	}

	return { confirmRestart, restartOnCredentialChange };
}
