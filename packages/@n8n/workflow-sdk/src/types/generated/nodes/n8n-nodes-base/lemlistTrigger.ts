/**
 * Lemlist Trigger Node Types
 *
 * Handle Lemlist events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/lemlisttrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LemlistTriggerV1Params {
	event:
		| '*'
		| 'contacted'
		| 'hooked'
		| 'attracted'
		| 'warmed'
		| 'interested'
		| 'skipped'
		| 'notInterested'
		| 'emailsSent'
		| 'emailsOpened'
		| 'emailsClicked'
		| 'emailsReplied'
		| 'emailsBounced'
		| 'emailsSendFailed'
		| 'emailsFailed'
		| 'emailsUnsubscribed'
		| 'emailsInterested'
		| 'emailsNotInterested'
		| 'opportunitiesDone'
		| 'aircallCreated'
		| 'aircallEnded'
		| 'aircallDone'
		| 'aircallInterested'
		| 'aircallNotInterested'
		| 'apiDone'
		| 'apiInterested'
		| 'apiNotInterested'
		| 'apiFailed'
		| 'linkedinVisitDone'
		| 'linkedinVisitFailed'
		| 'linkedinInviteDone'
		| 'linkedinInviteFailed'
		| 'linkedinInviteAccepted'
		| 'linkedinReplied'
		| 'linkedinSent'
		| 'linkedinVoiceNoteDone'
		| 'linkedinVoiceNoteFailed'
		| 'linkedinInterested'
		| 'linkedinNotInterested'
		| 'linkedinSendFailed'
		| 'manualInterested'
		| 'manualNotInterested'
		| 'paused'
		| 'resumed'
		| 'customDomainErrors'
		| 'connectionIssue'
		| 'sendLimitReached'
		| 'lemwarmPaused'
		| Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LemlistTriggerV1Credentials {
	lemlistApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LemlistTriggerNode = {
	type: 'n8n-nodes-base.lemlistTrigger';
	version: 1;
	config: NodeConfig<LemlistTriggerV1Params>;
	credentials?: LemlistTriggerV1Credentials;
	isTrigger: true;
};
