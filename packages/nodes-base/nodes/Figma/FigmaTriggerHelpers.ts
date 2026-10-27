import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Figma webhook request by comparing the `passcode` field in the
 * payload body against the passcode stored in the workflow static data when
 * the webhook was created.
 *
 * Figma includes the passcode supplied at webhook creation time in every
 * event payload (including PING). See:
 * https://developers.figma.com/docs/rest-api/webhooks-security/
 *
 * @returns true if the passcode matches, false otherwise
 * @returns true if no passcode is stored (backward compatibility with
 *          webhooks created before this verification was added)
 */
export function verifySignature(this: IWebhookFunctions): boolean {
	const webhookData = this.getWorkflowStaticData('node');
	const expectedPasscode = webhookData.webhookSecret;
	const bodyData = this.getBodyData();
	const actualPasscode = bodyData.passcode;

	return verifySignatureGeneric({
		getExpectedSignature: () =>
			typeof expectedPasscode === 'string' && expectedPasscode.length > 0 ? expectedPasscode : null,
		skipIfNoExpectedSignature: true,
		getActualSignature: () =>
			typeof actualPasscode === 'string' && actualPasscode.length > 0 ? actualPasscode : null,
	});
}
