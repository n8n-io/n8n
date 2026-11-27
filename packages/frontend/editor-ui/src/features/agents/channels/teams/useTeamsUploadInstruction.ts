import { useI18n } from '@n8n/i18n';

type Scopes = { teamChannels?: boolean; groupChats?: boolean };

export function useTeamsUploadInstruction() {
	const i18n = useI18n();

	function addToText(scopes?: Scopes) {
		if (scopes?.teamChannels && scopes.groupChats)
			return i18n.baseText('agents.channels.teams.setup.install.addTo.both');
		if (scopes?.teamChannels)
			return i18n.baseText('agents.channels.teams.setup.install.addTo.teams');
		if (scopes?.groupChats) return i18n.baseText('agents.channels.teams.setup.install.addTo.chats');
		return null;
	}

	return function uploadInstruction(scopes?: Scopes) {
		const upload = i18n.baseText('agents.channels.teams.setup.install.description');
		const addTo = addToText(scopes);
		// Composed through a key rather than joined here, so a locale owns both the
		// separator and the order of the two sentences.
		return addTo
			? i18n.baseText('agents.channels.teams.setup.install.descriptionWithScope', {
					interpolate: { upload, addTo },
				})
			: upload;
	};
}
