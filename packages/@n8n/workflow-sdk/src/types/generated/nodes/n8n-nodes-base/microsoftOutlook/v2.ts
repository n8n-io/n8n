/**
 * Microsoft Outlook Node - Version 2
 * Consume Microsoft Outlook API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new calendar */
export type MicrosoftOutlookV2CalendarCreateConfig = {
	resource: 'calendar';
	operation: 'create';
/**
 * The name of the calendar to create
 * @displayOptions.show { resource: ["calendar"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a calendar */
export type MicrosoftOutlookV2CalendarDeleteConfig = {
	resource: 'calendar';
	operation: 'delete';
	calendarId: ResourceLocatorValue;
};

/** Retrieve a calendar */
export type MicrosoftOutlookV2CalendarGetConfig = {
	resource: 'calendar';
	operation: 'get';
	calendarId: ResourceLocatorValue;
};

/** List and search calendars */
export type MicrosoftOutlookV2CalendarGetAllConfig = {
	resource: 'calendar';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["calendar"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["calendar"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a calendar */
export type MicrosoftOutlookV2CalendarUpdateConfig = {
	resource: 'calendar';
	operation: 'update';
	calendarId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Create a new calendar */
export type MicrosoftOutlookV2ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	givenName: string | Expression<string>;
	surname?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a calendar */
export type MicrosoftOutlookV2ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	contactId: ResourceLocatorValue;
};

/** Retrieve a calendar */
export type MicrosoftOutlookV2ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	contactId: ResourceLocatorValue;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { output: ["fields"], resource: ["contact"], operation: ["get"] }
 * @default []
 */
		fields?: Array<'createdDateTime' | 'lastModifiedDateTime' | 'changeKey' | 'categories' | 'parentFolderId' | 'birthday' | 'fileAs' | 'displayName' | 'givenName' | 'initials' | 'middleName' | 'nickName' | 'surname' | 'title' | 'yomiGivenName' | 'yomiSurname' | 'yomiCompanyName' | 'generation' | 'imAddresses' | 'jobTitle' | 'companyName' | 'department' | 'officeLocation' | 'profession' | 'businessHomePage' | 'assistantName' | 'manager' | 'homePhones' | 'mobilePhone' | 'businessPhones' | 'spouseName' | 'personalNotes' | 'children' | 'emailAddresses' | 'homeAddress' | 'businessAddress' | 'otherAddress'>;
};

/** List and search calendars */
export type MicrosoftOutlookV2ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["contact"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { output: ["fields"], resource: ["contact"], operation: ["getAll"] }
 * @default []
 */
		fields?: Array<'createdDateTime' | 'lastModifiedDateTime' | 'changeKey' | 'categories' | 'parentFolderId' | 'birthday' | 'fileAs' | 'displayName' | 'givenName' | 'initials' | 'middleName' | 'nickName' | 'surname' | 'title' | 'yomiGivenName' | 'yomiSurname' | 'yomiCompanyName' | 'generation' | 'imAddresses' | 'jobTitle' | 'companyName' | 'department' | 'officeLocation' | 'profession' | 'businessHomePage' | 'assistantName' | 'manager' | 'homePhones' | 'mobilePhone' | 'businessPhones' | 'spouseName' | 'personalNotes' | 'children' | 'emailAddresses' | 'homeAddress' | 'businessAddress' | 'otherAddress'>;
	filters?: Record<string, unknown>;
};

/** Update a calendar */
export type MicrosoftOutlookV2ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	contactId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Create a new calendar */
export type MicrosoftOutlookV2DraftCreateConfig = {
	resource: 'draft';
	operation: 'create';
/**
 * The subject of the message
 * @displayOptions.show { resource: ["draft"], operation: ["create"] }
 */
		subject?: string | Expression<string>;
/**
 * Message body content
 * @displayOptions.show { resource: ["draft"], operation: ["create"] }
 */
		bodyContent?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a calendar */
export type MicrosoftOutlookV2DraftDeleteConfig = {
	resource: 'draft';
	operation: 'delete';
	draftId: ResourceLocatorValue;
};

/** Retrieve a calendar */
export type MicrosoftOutlookV2DraftGetConfig = {
	resource: 'draft';
	operation: 'get';
	draftId: ResourceLocatorValue;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { output: ["fields"], resource: ["draft"], operation: ["get"] }
 * @default []
 */
		fields?: Array<'bccRecipients' | 'body' | 'bodyPreview' | 'categories' | 'ccRecipients' | 'changeKey' | 'conversationId' | 'createdDateTime' | 'flag' | 'from' | 'hasAttachments' | 'importance' | 'inferenceClassification' | 'internetMessageId' | 'isDeliveryReceiptRequested' | 'isDraft' | 'isRead' | 'isReadReceiptRequested' | 'lastModifiedDateTime' | 'parentFolderId' | 'receivedDateTime' | 'replyTo' | 'sender' | 'sentDateTime' | 'subject' | 'toRecipients' | 'webLink'>;
	options?: Record<string, unknown>;
};

/** Send an existing email draft */
export type MicrosoftOutlookV2DraftSendConfig = {
	resource: 'draft';
	operation: 'send';
	draftId: ResourceLocatorValue;
/**
 * Comma-separated list of email addresses of recipients
 * @displayOptions.show { resource: ["draft"], operation: ["send"] }
 */
		to?: string | Expression<string>;
};

/** Update a calendar */
export type MicrosoftOutlookV2DraftUpdateConfig = {
	resource: 'draft';
	operation: 'update';
	draftId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Create a new calendar */
export type MicrosoftOutlookV2EventCreateConfig = {
	resource: 'event';
	operation: 'create';
	calendarId: ResourceLocatorValue;
	subject: string | Expression<string>;
	startDateTime: string | Expression<string>;
	endDateTime: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a calendar */
export type MicrosoftOutlookV2EventDeleteConfig = {
	resource: 'event';
	operation: 'delete';
	calendarId: ResourceLocatorValue;
	eventId: string | Expression<string>;
};

/** Retrieve a calendar */
export type MicrosoftOutlookV2EventGetConfig = {
	resource: 'event';
	operation: 'get';
	calendarId: ResourceLocatorValue;
	eventId: string | Expression<string>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { output: ["fields"], resource: ["event"], operation: ["get"] }
 * @default []
 */
		fields?: Array<'allowNewTimeProposals' | 'attendees' | 'body' | 'bodyPreview' | 'categories' | 'changeKey' | 'createdDateTime' | 'end' | 'hasAttachments' | 'hideAttendees' | 'iCalUId' | 'importance' | 'isAllDay' | 'isCancelled' | 'isDraft' | 'isOnlineMeeting' | 'isOrganizer' | 'isReminderOn' | 'lastModifiedDateTime' | 'location' | 'locations' | 'onlineMeeting' | 'onlineMeetingProvider' | 'onlineMeetingUrl' | 'organizer' | 'originalEndTimeZone' | 'originalStartTimeZone' | 'recurrence' | 'reminderMinutesBeforeStart' | 'responseRequested' | 'responseStatus' | 'sensitivity' | 'seriesMasterId' | 'showAs' | 'start' | 'subject' | 'transactionId' | 'type' | 'webLink'>;
};

/** List and search calendars */
export type MicrosoftOutlookV2EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
	fromAllCalendars?: boolean | Expression<boolean>;
	calendarId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["event"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["event"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { output: ["fields"], resource: ["event"], operation: ["getAll"] }
 * @default []
 */
		fields?: Array<'allowNewTimeProposals' | 'attendees' | 'body' | 'bodyPreview' | 'categories' | 'changeKey' | 'createdDateTime' | 'end' | 'hasAttachments' | 'hideAttendees' | 'iCalUId' | 'importance' | 'isAllDay' | 'isCancelled' | 'isDraft' | 'isOnlineMeeting' | 'isOrganizer' | 'isReminderOn' | 'lastModifiedDateTime' | 'location' | 'locations' | 'onlineMeeting' | 'onlineMeetingProvider' | 'onlineMeetingUrl' | 'organizer' | 'originalEndTimeZone' | 'originalStartTimeZone' | 'recurrence' | 'reminderMinutesBeforeStart' | 'responseRequested' | 'responseStatus' | 'sensitivity' | 'seriesMasterId' | 'showAs' | 'start' | 'subject' | 'transactionId' | 'type' | 'webLink'>;
	filters?: Record<string, unknown>;
};

/** Update a calendar */
export type MicrosoftOutlookV2EventUpdateConfig = {
	resource: 'event';
	operation: 'update';
	calendarId: ResourceLocatorValue;
	eventId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new calendar */
export type MicrosoftOutlookV2FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
/**
 * Name of the folder
 * @displayOptions.show { resource: ["folder"], operation: ["create"] }
 */
		displayName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a calendar */
export type MicrosoftOutlookV2FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	folderId: ResourceLocatorValue;
};

/** Retrieve a calendar */
export type MicrosoftOutlookV2FolderGetConfig = {
	resource: 'folder';
	operation: 'get';
	folderId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** List and search calendars */
export type MicrosoftOutlookV2FolderGetAllConfig = {
	resource: 'folder';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["folder"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["folder"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Update a calendar */
export type MicrosoftOutlookV2FolderUpdateConfig = {
	resource: 'folder';
	operation: 'update';
	folderId: ResourceLocatorValue;
/**
 * Name of the folder
 * @displayOptions.show { resource: ["folder"], operation: ["update"] }
 */
		displayName: string | Expression<string>;
};

/** List and search calendars */
export type MicrosoftOutlookV2FolderMessageGetAllConfig = {
	resource: 'folderMessage';
	operation: 'getAll';
	folderId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["folderMessage"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["folderMessage"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { output: ["fields"], resource: ["folderMessage"], operation: ["getAll"] }
 * @default []
 */
		fields?: Array<'bccRecipients' | 'body' | 'bodyPreview' | 'categories' | 'ccRecipients' | 'changeKey' | 'conversationId' | 'createdDateTime' | 'flag' | 'from' | 'hasAttachments' | 'importance' | 'inferenceClassification' | 'internetMessageId' | 'isDeliveryReceiptRequested' | 'isDraft' | 'isRead' | 'isReadReceiptRequested' | 'lastModifiedDateTime' | 'parentFolderId' | 'receivedDateTime' | 'replyTo' | 'sender' | 'sentDateTime' | 'subject' | 'toRecipients' | 'webLink'>;
	filtersUI?: {
		values?: {
			/** Filter By
			 * @default filters
			 */
			filterBy?: 'filters' | 'search' | Expression<string>;
			/** Only return messages that contains search term. Without specific message properties, the search is carried out on the default search properties of from, subject, and body. &lt;a href="https://docs.microsoft.com/en-us/graph/query-parameters#search-parameter target="_blank"&gt;More info&lt;/a&gt;.
			 * @displayOptions.show { filterBy: ["search"] }
			 */
			search?: string | Expression<string>;
			/** Filters
			 * @displayOptions.show { filterBy: ["filters"] }
			 * @default {}
			 */
			filters?: Record<string, unknown>;
		};
	};
	options?: Record<string, unknown>;
};

/** Delete a calendar */
export type MicrosoftOutlookV2MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	messageId: ResourceLocatorValue;
};

/** Retrieve a calendar */
export type MicrosoftOutlookV2MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	messageId: ResourceLocatorValue;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { output: ["fields"], resource: ["message"], operation: ["get"] }
 * @default []
 */
		fields?: Array<'bccRecipients' | 'body' | 'bodyPreview' | 'categories' | 'ccRecipients' | 'changeKey' | 'conversationId' | 'createdDateTime' | 'flag' | 'from' | 'hasAttachments' | 'importance' | 'inferenceClassification' | 'internetMessageId' | 'isDeliveryReceiptRequested' | 'isDraft' | 'isRead' | 'isReadReceiptRequested' | 'lastModifiedDateTime' | 'parentFolderId' | 'receivedDateTime' | 'replyTo' | 'sender' | 'sentDateTime' | 'subject' | 'toRecipients' | 'webLink'>;
	options?: Record<string, unknown>;
};

/** List and search calendars */
export type MicrosoftOutlookV2MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["message"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["message"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { output: ["fields"], resource: ["message"], operation: ["getAll"] }
 * @default []
 */
		fields?: Array<'bccRecipients' | 'body' | 'bodyPreview' | 'categories' | 'ccRecipients' | 'changeKey' | 'conversationId' | 'createdDateTime' | 'flag' | 'from' | 'hasAttachments' | 'importance' | 'inferenceClassification' | 'internetMessageId' | 'isDeliveryReceiptRequested' | 'isDraft' | 'isRead' | 'isReadReceiptRequested' | 'lastModifiedDateTime' | 'parentFolderId' | 'receivedDateTime' | 'replyTo' | 'sender' | 'sentDateTime' | 'subject' | 'toRecipients' | 'webLink'>;
	filtersUI?: {
		values?: {
			/** Filter By
			 * @default filters
			 */
			filterBy?: 'filters' | 'search' | Expression<string>;
			/** Only return messages that contains search term. Without specific message properties, the search is carried out on the default search properties of from, subject, and body. &lt;a href="https://docs.microsoft.com/en-us/graph/query-parameters#search-parameter target="_blank"&gt;More info&lt;/a&gt;.
			 * @displayOptions.show { filterBy: ["search"] }
			 */
			search?: string | Expression<string>;
			/** Filters
			 * @displayOptions.show { filterBy: ["filters"] }
			 * @default {}
			 */
			filters?: Record<string, unknown>;
		};
	};
	options?: Record<string, unknown>;
};

/** Move a message to a folder */
export type MicrosoftOutlookV2MessageMoveConfig = {
	resource: 'message';
	operation: 'move';
	messageId: ResourceLocatorValue;
	folderId: ResourceLocatorValue;
};

/** Create a reply to a message */
export type MicrosoftOutlookV2MessageReplyConfig = {
	resource: 'message';
	operation: 'reply';
	messageId: ResourceLocatorValue;
/**
 * Whether to reply to the sender only or to the entire list of recipients
 * @displayOptions.show { resource: ["message"], operation: ["reply"] }
 * @default false
 */
		replyToSenderOnly?: boolean | Expression<boolean>;
/**
 * Message body content
 * @displayOptions.show { resource: ["message"], operation: ["reply"] }
 */
		message?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Send an existing email draft */
export type MicrosoftOutlookV2MessageSendConfig = {
	resource: 'message';
	operation: 'send';
/**
 * Comma-separated list of email addresses of recipients
 * @displayOptions.show { resource: ["message"], operation: ["send"] }
 */
		toRecipients: string | Expression<string>;
/**
 * The subject of the message
 * @displayOptions.show { resource: ["message"], operation: ["send"] }
 */
		subject?: string | Expression<string>;
/**
 * Message body content
 * @displayOptions.show { resource: ["message"], operation: ["send"] }
 */
		bodyContent?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Send a message and wait for response */
export type MicrosoftOutlookV2MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
/**
 * Comma-separated list of email addresses of recipients
 * @displayOptions.show { resource: ["message"], operation: ["sendAndWait"] }
 */
		toRecipients: string | Expression<string>;
	subject: string | Expression<string>;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	approvalOptions?: {
		values?: {
			/** Type of Approval
			 * @default single
			 */
			approvalType?: 'single' | 'double' | Expression<string>;
			/** Approve Button Label
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default Approve
			 */
			approveLabel?: string | Expression<string>;
			/** Approve Button Style
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default primary
			 */
			buttonApprovalStyle?: 'primary' | 'secondary' | Expression<string>;
			/** Disapprove Button Label
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default Decline
			 */
			disapproveLabel?: string | Expression<string>;
			/** Disapprove Button Style
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default secondary
			 */
			buttonDisapprovalStyle?: 'primary' | 'secondary' | Expression<string>;
		};
	};
	options?: Record<string, unknown>;
};

/** Update a calendar */
export type MicrosoftOutlookV2MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
	messageId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Add an attachment to a message */
export type MicrosoftOutlookV2MessageAttachmentAddConfig = {
	resource: 'messageAttachment';
	operation: 'add';
	messageId: ResourceLocatorValue;
	binaryPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Download an attachment from a message */
export type MicrosoftOutlookV2MessageAttachmentDownloadConfig = {
	resource: 'messageAttachment';
	operation: 'download';
	messageId: ResourceLocatorValue;
	attachmentId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Retrieve a calendar */
export type MicrosoftOutlookV2MessageAttachmentGetConfig = {
	resource: 'messageAttachment';
	operation: 'get';
	messageId: ResourceLocatorValue;
	attachmentId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** List and search calendars */
export type MicrosoftOutlookV2MessageAttachmentGetAllConfig = {
	resource: 'messageAttachment';
	operation: 'getAll';
	messageId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["messageAttachment"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["messageAttachment"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOutlookV2Credentials {
	microsoftOutlookOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftOutlookV2NodeBase {
	type: 'n8n-nodes-base.microsoftOutlook';
	version: 2;
	credentials?: MicrosoftOutlookV2Credentials;
}

export type MicrosoftOutlookV2CalendarCreateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2CalendarCreateConfig>;
};

export type MicrosoftOutlookV2CalendarDeleteNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2CalendarDeleteConfig>;
};

export type MicrosoftOutlookV2CalendarGetNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2CalendarGetConfig>;
};

export type MicrosoftOutlookV2CalendarGetAllNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2CalendarGetAllConfig>;
};

export type MicrosoftOutlookV2CalendarUpdateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2CalendarUpdateConfig>;
};

export type MicrosoftOutlookV2ContactCreateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2ContactCreateConfig>;
};

export type MicrosoftOutlookV2ContactDeleteNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2ContactDeleteConfig>;
};

export type MicrosoftOutlookV2ContactGetNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2ContactGetConfig>;
};

export type MicrosoftOutlookV2ContactGetAllNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2ContactGetAllConfig>;
};

export type MicrosoftOutlookV2ContactUpdateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2ContactUpdateConfig>;
};

export type MicrosoftOutlookV2DraftCreateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2DraftCreateConfig>;
};

export type MicrosoftOutlookV2DraftDeleteNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2DraftDeleteConfig>;
};

export type MicrosoftOutlookV2DraftGetNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2DraftGetConfig>;
};

export type MicrosoftOutlookV2DraftSendNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2DraftSendConfig>;
};

export type MicrosoftOutlookV2DraftUpdateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2DraftUpdateConfig>;
};

export type MicrosoftOutlookV2EventCreateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2EventCreateConfig>;
};

export type MicrosoftOutlookV2EventDeleteNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2EventDeleteConfig>;
};

export type MicrosoftOutlookV2EventGetNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2EventGetConfig>;
};

export type MicrosoftOutlookV2EventGetAllNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2EventGetAllConfig>;
};

export type MicrosoftOutlookV2EventUpdateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2EventUpdateConfig>;
};

export type MicrosoftOutlookV2FolderCreateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2FolderCreateConfig>;
};

export type MicrosoftOutlookV2FolderDeleteNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2FolderDeleteConfig>;
};

export type MicrosoftOutlookV2FolderGetNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2FolderGetConfig>;
};

export type MicrosoftOutlookV2FolderGetAllNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2FolderGetAllConfig>;
};

export type MicrosoftOutlookV2FolderUpdateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2FolderUpdateConfig>;
};

export type MicrosoftOutlookV2FolderMessageGetAllNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2FolderMessageGetAllConfig>;
};

export type MicrosoftOutlookV2MessageDeleteNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageDeleteConfig>;
};

export type MicrosoftOutlookV2MessageGetNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageGetConfig>;
};

export type MicrosoftOutlookV2MessageGetAllNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageGetAllConfig>;
};

export type MicrosoftOutlookV2MessageMoveNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageMoveConfig>;
};

export type MicrosoftOutlookV2MessageReplyNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageReplyConfig>;
};

export type MicrosoftOutlookV2MessageSendNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageSendConfig>;
};

export type MicrosoftOutlookV2MessageSendAndWaitNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageSendAndWaitConfig>;
};

export type MicrosoftOutlookV2MessageUpdateNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageUpdateConfig>;
};

export type MicrosoftOutlookV2MessageAttachmentAddNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageAttachmentAddConfig>;
};

export type MicrosoftOutlookV2MessageAttachmentDownloadNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageAttachmentDownloadConfig>;
};

export type MicrosoftOutlookV2MessageAttachmentGetNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageAttachmentGetConfig>;
};

export type MicrosoftOutlookV2MessageAttachmentGetAllNode = MicrosoftOutlookV2NodeBase & {
	config: NodeConfig<MicrosoftOutlookV2MessageAttachmentGetAllConfig>;
};

export type MicrosoftOutlookV2Node =
	| MicrosoftOutlookV2CalendarCreateNode
	| MicrosoftOutlookV2CalendarDeleteNode
	| MicrosoftOutlookV2CalendarGetNode
	| MicrosoftOutlookV2CalendarGetAllNode
	| MicrosoftOutlookV2CalendarUpdateNode
	| MicrosoftOutlookV2ContactCreateNode
	| MicrosoftOutlookV2ContactDeleteNode
	| MicrosoftOutlookV2ContactGetNode
	| MicrosoftOutlookV2ContactGetAllNode
	| MicrosoftOutlookV2ContactUpdateNode
	| MicrosoftOutlookV2DraftCreateNode
	| MicrosoftOutlookV2DraftDeleteNode
	| MicrosoftOutlookV2DraftGetNode
	| MicrosoftOutlookV2DraftSendNode
	| MicrosoftOutlookV2DraftUpdateNode
	| MicrosoftOutlookV2EventCreateNode
	| MicrosoftOutlookV2EventDeleteNode
	| MicrosoftOutlookV2EventGetNode
	| MicrosoftOutlookV2EventGetAllNode
	| MicrosoftOutlookV2EventUpdateNode
	| MicrosoftOutlookV2FolderCreateNode
	| MicrosoftOutlookV2FolderDeleteNode
	| MicrosoftOutlookV2FolderGetNode
	| MicrosoftOutlookV2FolderGetAllNode
	| MicrosoftOutlookV2FolderUpdateNode
	| MicrosoftOutlookV2FolderMessageGetAllNode
	| MicrosoftOutlookV2MessageDeleteNode
	| MicrosoftOutlookV2MessageGetNode
	| MicrosoftOutlookV2MessageGetAllNode
	| MicrosoftOutlookV2MessageMoveNode
	| MicrosoftOutlookV2MessageReplyNode
	| MicrosoftOutlookV2MessageSendNode
	| MicrosoftOutlookV2MessageSendAndWaitNode
	| MicrosoftOutlookV2MessageUpdateNode
	| MicrosoftOutlookV2MessageAttachmentAddNode
	| MicrosoftOutlookV2MessageAttachmentDownloadNode
	| MicrosoftOutlookV2MessageAttachmentGetNode
	| MicrosoftOutlookV2MessageAttachmentGetAllNode
	;