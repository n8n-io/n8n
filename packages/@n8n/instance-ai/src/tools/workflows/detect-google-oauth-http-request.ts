import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ValidationWarning } from './workflow-validation-warnings';

const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';

/**
 * Service-specific Google OAuth credentials (Sheets, Docs, Drive, Gmail, ...).
 * The generic `googleOAuth2Api` is meant for HTTP Request, so it does not match.
 */
const GOOGLE_SERVICE_OAUTH_CREDENTIAL = /^(?:google[A-Za-z]+OAuth2Api|gmailOAuth2)$/;

/**
 * Flags HTTP Request nodes that call a Google API with a service-specific Google
 * OAuth credential. n8n Cloud managed Google credentials refuse HTTP Request use,
 * and a dedicated Google node is the supported route on every instance.
 */
export function detectGoogleOAuthHttpRequest(json: WorkflowJSON): ValidationWarning[] {
	const warnings: ValidationWarning[] = [];

	for (const node of json.nodes ?? []) {
		if (node.type !== HTTP_REQUEST_NODE_TYPE) continue;
		const params = node.parameters;
		if (!isRecord(params) || params.authentication !== 'predefinedCredentialType') continue;

		const credentialType = params.nodeCredentialType;
		if (typeof credentialType !== 'string') continue;
		if (!GOOGLE_SERVICE_OAUTH_CREDENTIAL.test(credentialType)) continue;

		warnings.push({
			code: 'GOOGLE_OAUTH_HTTP_REQUEST',
			nodeName: typeof node.name === 'string' ? node.name : undefined,
			severity: 'informational',
			message:
				`This HTTP Request node authenticates with the Google credential "${credentialType}". ` +
				'On n8n Cloud, managed Google credentials cannot be used in an HTTP Request node, ' +
				'so the node fails at runtime. ' +
				'Use the dedicated Google node (Google Sheets, Google Docs, Google Drive, Gmail) instead. ' +
				'If that node cannot do what the user asked, for example rich text formatting, ' +
				'tell the user what it cannot do. Do not work around it with a raw Google API call.',
		});
	}

	return warnings;
}
