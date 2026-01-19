/**
 * Zoom Node - Version 1
 * Consume Zoom API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a meeting */
export type ZoomV1MeetingCreateConfig = {
	resource: 'meeting';
	operation: 'create';
/**
 * Topic of the meeting
 * @displayOptions.show { operation: ["create"], resource: ["meeting"] }
 */
		topic?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a meeting */
export type ZoomV1MeetingDeleteConfig = {
	resource: 'meeting';
	operation: 'delete';
/**
 * Meeting ID
 * @displayOptions.show { operation: ["delete"], resource: ["meeting"] }
 */
		meetingId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Retrieve a meeting */
export type ZoomV1MeetingGetConfig = {
	resource: 'meeting';
	operation: 'get';
/**
 * Meeting ID
 * @displayOptions.show { operation: ["get"], resource: ["meeting"] }
 */
		meetingId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Retrieve many meetings */
export type ZoomV1MeetingGetAllConfig = {
	resource: 'meeting';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["meeting"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["meeting"], returnAll: [false] }
 * @default 30
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a meeting */
export type ZoomV1MeetingUpdateConfig = {
	resource: 'meeting';
	operation: 'update';
/**
 * Meeting ID
 * @displayOptions.show { operation: ["update"], resource: ["meeting"] }
 */
		meetingId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type ZoomV1MeetingCreateOutput = {
	created_at?: string;
	creation_source?: string;
	duration?: number;
	encrypted_password?: string;
	h323_password?: string;
	host_email?: string;
	host_id?: string;
	id?: number;
	join_url?: string;
	password?: string;
	pre_schedule?: boolean;
	pstn_password?: string;
	settings?: {
		allow_host_control_participant_mute_state?: boolean;
		allow_multiple_devices?: boolean;
		alternative_host_update_polls?: boolean;
		alternative_hosts?: string;
		alternative_hosts_email_notification?: boolean;
		approval_type?: number;
		approved_or_denied_countries_or_regions?: {
			enable?: boolean;
		};
		audio?: string;
		auto_recording?: string;
		breakout_room?: {
			enable?: boolean;
		};
		close_registration?: boolean;
		cn_meeting?: boolean;
		continuous_meeting_chat?: {
			auto_add_invited_external_users?: boolean;
			auto_add_meeting_participants?: boolean;
			channel_id?: string;
			enable?: boolean;
		};
		device_testing?: boolean;
		email_in_attendee_report?: boolean;
		email_notification?: boolean;
		encryption_type?: string;
		enforce_login?: boolean;
		enforce_login_domains?: string;
		focus_mode?: boolean;
		host_save_video_order?: boolean;
		host_video?: boolean;
		in_meeting?: boolean;
		internal_meeting?: boolean;
		jbh_time?: number;
		join_before_host?: boolean;
		meeting_authentication?: boolean;
		mute_upon_entry?: boolean;
		participant_focused_meeting?: boolean;
		participant_video?: boolean;
		private_meeting?: boolean;
		push_change_to_calendar?: boolean;
		registrants_confirmation_email?: boolean;
		registrants_email_notification?: boolean;
		request_permission_to_unmute_participants?: boolean;
		show_join_info?: boolean;
		show_share_button?: boolean;
		sign_language_interpretation?: {
			enable?: boolean;
		};
		use_pmi?: boolean;
		waiting_room?: boolean;
		watermark?: boolean;
	};
	start_time?: string;
	start_url?: string;
	status?: string;
	supportGoLive?: boolean;
	timezone?: string;
	topic?: string;
	type?: number;
	uuid?: string;
};

export type ZoomV1MeetingGetOutput = {
	agenda?: string;
	assistant_id?: string;
	created_at?: string;
	duration?: number;
	host_email?: string;
	host_id?: string;
	id?: number;
	join_url?: string;
	pre_schedule?: boolean;
	settings?: {
		allow_multiple_devices?: boolean;
		alternative_host_update_polls?: boolean;
		alternative_hosts?: string;
		alternative_hosts_email_notification?: boolean;
		approval_type?: number;
		approved_or_denied_countries_or_regions?: {
			enable?: boolean;
		};
		audio?: string;
		auto_recording?: string;
		auto_start_ai_companion_questions?: boolean;
		auto_start_meeting_summary?: boolean;
		breakout_room?: {
			enable?: boolean;
		};
		close_registration?: boolean;
		cn_meeting?: boolean;
		continuous_meeting_chat?: {
			auto_add_invited_external_users?: boolean;
			channel_id?: string;
			enable?: boolean;
		};
		device_testing?: boolean;
		email_in_attendee_report?: boolean;
		email_notification?: boolean;
		enable_dedicated_group_chat?: boolean;
		encryption_type?: string;
		enforce_login?: boolean;
		enforce_login_domains?: string;
		focus_mode?: boolean;
		global_dial_in_countries?: Array<string>;
		global_dial_in_numbers?: Array<{
			city?: string;
			country?: string;
			country_name?: string;
			number?: string;
			type?: string;
		}>;
		host_save_video_order?: boolean;
		host_video?: boolean;
		in_meeting?: boolean;
		internal_meeting?: boolean;
		jbh_time?: number;
		join_before_host?: boolean;
		meeting_authentication?: boolean;
		meeting_invitees?: Array<{
			email?: string;
		}>;
		mute_upon_entry?: boolean;
		participant_focused_meeting?: boolean;
		participant_video?: boolean;
		private_meeting?: boolean;
		push_change_to_calendar?: boolean;
		registrants_confirmation_email?: boolean;
		registrants_email_notification?: boolean;
		request_permission_to_unmute_participants?: boolean;
		show_join_info?: boolean;
		show_share_button?: boolean;
		sign_language_interpretation?: {
			enable?: boolean;
		};
		use_pmi?: boolean;
		waiting_room?: boolean;
		watermark?: boolean;
	};
	start_time?: string;
	start_url?: string;
	status?: string;
	timezone?: string;
	topic?: string;
	type?: number;
	uuid?: string;
};

export type ZoomV1MeetingGetAllOutput = {
	created_at?: string;
	duration?: number;
	host_id?: string;
	id?: number;
	join_url?: string;
	start_time?: string;
	timezone?: string;
	topic?: string;
	type?: number;
	uuid?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZoomV1Credentials {
	zoomApi: CredentialReference;
	zoomOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ZoomV1NodeBase {
	type: 'n8n-nodes-base.zoom';
	version: 1;
	credentials?: ZoomV1Credentials;
}

export type ZoomV1MeetingCreateNode = ZoomV1NodeBase & {
	config: NodeConfig<ZoomV1MeetingCreateConfig>;
	output?: ZoomV1MeetingCreateOutput;
};

export type ZoomV1MeetingDeleteNode = ZoomV1NodeBase & {
	config: NodeConfig<ZoomV1MeetingDeleteConfig>;
};

export type ZoomV1MeetingGetNode = ZoomV1NodeBase & {
	config: NodeConfig<ZoomV1MeetingGetConfig>;
	output?: ZoomV1MeetingGetOutput;
};

export type ZoomV1MeetingGetAllNode = ZoomV1NodeBase & {
	config: NodeConfig<ZoomV1MeetingGetAllConfig>;
	output?: ZoomV1MeetingGetAllOutput;
};

export type ZoomV1MeetingUpdateNode = ZoomV1NodeBase & {
	config: NodeConfig<ZoomV1MeetingUpdateConfig>;
};

export type ZoomV1Node =
	| ZoomV1MeetingCreateNode
	| ZoomV1MeetingDeleteNode
	| ZoomV1MeetingGetNode
	| ZoomV1MeetingGetAllNode
	| ZoomV1MeetingUpdateNode
	;