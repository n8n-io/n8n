import { isRecord } from '@n8n/utils/is-record';

import type { ApprovalResponder } from './confirmation-policy';

/** Approving a credential card means "Auto-setup with browser". A bare approval
 *  takes the "user picked an existing credential" branch, so the orchestrator never
 *  sees `needsBrowserSetup=true` — the flag that wires it to the Computer Use
 *  credential setup skill. The card offers one credential at a time once browser
 *  setup is in play, so the first request is the one `autoSetup` names. */
export const credentialAutoSetupResponder: ApprovalResponder = (payload) => {
	const requests = payload.credentialRequests;
	if (!Array.isArray(requests)) return undefined;

	const first: unknown = requests[0];
	if (!isRecord(first) || typeof first.credentialType !== 'string' || !first.credentialType) {
		return undefined;
	}
	return { autoSetup: { credentialType: first.credentialType } };
};
