import { i18n } from '../../plugins/i18n';

export const CREDENTIAL_MARKDOWN_DOCS: Record<string, string> = {
	aws: i18n.baseText('credentialEdit.docs.aws'),
	gmailOAuth2: i18n.baseText('credentialEdit.docs.gmailOAuth2'),
	openAiApi: i18n.baseText('credentialEdit.docs.openAiApi'),
};
