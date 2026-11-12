import { type ContextCueSet, whileSkillLoaded } from '@n8n/agents';

/**
 * Context cues for `workflow-builder` references. Each reference keeps its
 * procedure. These step-specific rules arrive only when the step matches.
 */
export const ONE_OFF_OPERATIONS_CUES: ContextCueSet = {
	id: 'one-off-operations',
	isActive: whileSkillLoaded('one-off-operations'),
	cues: [
		{
			id: 'execute-node-conditions',
			text: "`execute_node` is enough only when: the effect is one node call (a read-back may be a second run), the input items are already at hand and passed literally (no expressions to other nodes), the node needs no sub-nodes, a usable credential exists (pass resolved `{ id, name }`), and the run fits the 60s cap. Read `get_node_types` first. It runs in this conversation's project; if a credential is not accessible there, fall back to a workflow. Its approval card is the consent gate, and its output items are real, so report only from them.",
			appliesWhen: 'Running a single node directly with `execute_node` for a one-off effect.',
		},
		{
			id: 'one-off-manual-trigger',
			text: 'A one-off workflow always uses a manual trigger: it is never published, so an event trigger would never fire. If the task needs an event source or a future run time, it is not a one-off.',
			appliesWhen: 'Choosing the trigger for a one-off workflow.',
		},
		{
			id: 'one-off-live-run-consent',
			text: 'For a one-off, the live run is what the user asked for: the run-approval card is the consent gate. Do not run before setup is complete.',
			appliesWhen: 'Running a one-off workflow live.',
		},
		{
			id: 'one-off-read-back',
			text: 'Read back with `get_execution_node_output` before you report: the run result is truncated. Check that each write node received the intended rows, not an upstream API response. Report only numbers, columns and shapes you actually read; if you could not read it back, say what is unconfirmed. A success status alone does not prove the right data was written.',
			appliesWhen:
				'Reporting the result of a one-off run, or claiming how many rows or records were written.',
		},
		{
			id: 'one-off-cleanup',
			text: 'After success, ask whether to keep the workflow or delete it; never delete without asking. A kept workflow stays unpublished. Never offer to undo the data the one-off wrote: that is the deliverable.',
			appliesWhen: 'A one-off operation succeeded and the workflow is no longer needed.',
		},
		{
			id: 'one-off-simulated-verification',
			text: 'Verification is optional for a one-off; offer it only for complex wiring or a cautious user. If you run it, say which nodes were simulated and that data into simulated writes was not validated. Never call the workflow verified, tested or working from a simulated pass, and never let it replace the live run and read-back.',
			appliesWhen:
				'Considering or reporting `workflow_builder_verify_built_workflow` for a one-off workflow.',
		},
	],
};

export const SERVICE_SELECTION_CUES: ContextCueSet = {
	id: 'service-selection',
	isActive: whileSkillLoaded('service-selection'),
	cues: [
		{
			id: 'gateway-node-constraints',
			text: 'For a Gateway-credits node, set `typeVersion >= aiGateway.minVersion`, keep `resource`/`operation` to `aiGateway.operations` (nodes without a resource use the key `__operation_only__`), and do not set parameters in `aiGateway.hiddenProperties`.',
			appliesWhen: 'Configuring a node whose discovery result has `aiGateway.supported: true`.',
		},
		{
			id: 'gateway-enumeration',
			text: 'To list what Gateway credits support: `search_nodes` with `gatewayCreditsOnly: true` for nodes, `search_credential_types(gatewayCreditsOnly=true)` for credential types, and `get_node_types` → `aiGateway.operations` for one node.',
			appliesWhen: 'The user asks what Gateway credits support or cover.',
		},
		{
			id: 'gateway-depleted',
			text: 'When `credentialResolutionNote` says Gateway credits are depleted, tell the user to top up or add their own key on the node. Do not say the workflow works out of the box, and do not offer a live test.',
			appliesWhen:
				'A build result carries a `credentialResolutionNote` about depleted Gateway credits.',
		},
		{
			id: 'gateway-user-facing-name',
			text: 'Call the feature "Gateway credits" in chat, never "n8n credits", "n8n Connect", "AI Gateway" or "gateway". Read the `aiGateway` field, never name it.',
			appliesWhen: 'Mentioning Gateway credits or managed credentials to the user.',
		},
		{
			id: 'setup-preference-metrics',
			text: '`setupPreference` entries carry `setupCompletionPercent` (completion of an Assistant setup step, not activation or validity; rounded to 5) and `popularityScore` (relative recent adoption, 0–1). `null` means not enough data. Treat both as coarse; ignore small differences, compute no combined score, and never let them override semantic fit or pick between auth methods for one service.',
			appliesWhen: 'Comparing candidate services using `setupPreference` from discovery results.',
		},
	],
};

export const CREDENTIAL_CHOICES_CUES: ContextCueSet = {
	id: 'credential-choices',
	isActive: whileSkillLoaded('credential-choices'),
	cues: [
		{
			id: 'explicit-new-credential',
			text: 'For an explicit request for a new credential, pass its type in `preferNewCredentials` on `workflow_builder_build_workflow` and on `setup_workflow` (or `preferNew: true` on the `setup_credentials` entry). If the user skipped that card earlier, also pass `reopenSkipped` to `setup_workflow`. Never pass it by default. Do not ask them to choose among existing credentials; setup still lists them.',
			appliesWhen:
				'The user explicitly asks to create a new credential instead of using an existing one.',
		},
		{
			id: 'multiple-credentials-same-type',
			text: 'When several credentials of one type exist, the setup card lists them: do not ask in chat or with `ask_user`, unless the user already named one, then use it.',
			appliesWhen: 'The user has more than one credential of the type a node needs.',
		},
		{
			id: 'auth-type-question',
			text: 'Ask which auth type to use only for a standalone `setup_credentials` request: `ask_user` single-select, OAuth2 first and recommended, skipped when the user named the type. In a workflow build, never ask about the auth type: the build picks it and setup collects the credential.',
			appliesWhen: 'A service offers more than one credential type, such as API key and OAuth2.',
		},
		{
			id: 'no-credential-question-before-build',
			text: 'Before the first build, do not ask about credentials or whether to build now and set up later: the builder keeps valid credentials and mocks missing ones, and setup comes after verification.',
			appliesWhen: 'About to build a workflow when the user has not connected a credential yet.',
		},
	],
};
