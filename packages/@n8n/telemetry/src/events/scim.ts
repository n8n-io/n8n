import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

/** What turned the pre-GA SCIM opt-in on for the instance. */
const optInSource = z
	.enum(['config', 'flag'])
	.nullable()
	.describe('The N8N_SCIM_OPT_IN config switch or the instance PostHog flag');

/** Where the SCIM settings page stands when it renders. */
const pageStatus = z
	.enum(['needs_sso', 'off', 'no_token', 'waiting', 'connected', 'error'])
	.describe(
		'needs_sso: single sign-on is off. off: SCIM is disabled. no_token: enabled without a token. waiting, connected, error: the backend connection status',
	);

/** Why the SCIM bearer check rejected the last request from the identity provider. */
const errorCause = z.enum(['missing_header', 'invalid_token', 'superseded_token']);

/** What kind of transfer target the admin picked: the personal project of a person, or a team project. */
const transferTargetType = z.enum(['person', 'project']);

export const SCIM_TELEMETRY = defineTelemetryEvents({
	SCIM_SETTINGS_VIEWED: {
		name: 'User viewed SCIM settings',
		description:
			'The SCIM settings page rendered with its state known. Fires once per page open, after the config request finished. Carries the opt-in source so the funnel splits by rollout path.',
		properties: z.object({
			opt_in_source: optInSource,
			status: pageStatus,
			error_cause: errorCause.optional().describe('Set only when status is error'),
		}),
	},
	SCIM_SET_UP_SSO_CLICKED: {
		name: 'User clicked SCIM set up SSO',
		description:
			'The user clicked "Set up single sign-on" in the needs-SSO state of the SCIM settings page. The app opens the SSO settings page.',
		properties: z.object({}),
	},
	SCIM_BASE_URL_COPIED: {
		name: 'User copied SCIM base URL',
		description: 'The user copied the SCIM base URL from the SCIM settings page.',
		properties: z.object({}),
	},
	SCIM_TOKEN_COPIED: {
		name: 'User copied SCIM token',
		description:
			'The user copied the SCIM bearer token right after it was generated or rotated. The token value is never sent.',
		properties: z.object({}),
	},
	SCIM_HELP_LINK_CLICKED: {
		name: 'User clicked SCIM help link',
		description:
			'The user opened the SCIM docs from a callout on the SCIM settings page: the test-connection help while waiting for the first request, or the docs link in the error state.',
		properties: z.object({
			link: z.enum(['docs', 'test_help']),
			status: z.enum(['waiting', 'error']),
			source: z.literal('scim_page'),
		}),
	},
	SCIM_DEPROVISIONING_SETTING_CHANGED: {
		name: 'User changed SCIM deprovisioning setting',
		description:
			'The user changed what SCIM DELETE does, through the autosaving controls or the delete users dialog on the SCIM settings page. Fires after the save request finished, with its result.',
		properties: z.object({
			on_delete: z.enum(['delete', 'disable']),
			data_action: z.enum(['transfer', 'delete']),
			transfer_target_type: transferTargetType
				.optional()
				.describe('Set when data_action is transfer and a target is stored'),
			result: z.enum(['success', 'error']),
		}),
	},
	SCIM_DELETE_USERS_DIALOG_CLOSED: {
		name: 'User closed SCIM delete users dialog',
		description:
			'The delete users dialog on the SCIM settings page closed. The outcome says whether the user saved a transfer, saved a delete, or cancelled.',
		properties: z.object({
			outcome: z.enum(['transfer', 'delete', 'cancel']),
			target_type: transferTargetType.optional().describe('Set when the outcome is transfer'),
		}),
	},
	SCIM_TRANSFER_TARGET_CHANGED: {
		name: 'User changed SCIM transfer target',
		description:
			'The user saved a new transfer target for the SCIM deprovisioning policy. Carries where the picker opened from and whether the user searched. Never carries the target itself.',
		properties: z.object({
			source: z.enum(['data_switch', 'pencil', 'delete_dialog']),
			target_type: transferTargetType,
			search_used: z.boolean(),
		}),
	},
});
