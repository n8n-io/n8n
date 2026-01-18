/**
 * Microsoft Outlook Node Types
 *
 * Consume Microsoft Outlook API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftoutlook/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default []
	 */
	fields?: Array<
		| 'createdDateTime'
		| 'lastModifiedDateTime'
		| 'changeKey'
		| 'categories'
		| 'parentFolderId'
		| 'birthday'
		| 'fileAs'
		| 'displayName'
		| 'givenName'
		| 'initials'
		| 'middleName'
		| 'nickName'
		| 'surname'
		| 'title'
		| 'yomiGivenName'
		| 'yomiSurname'
		| 'yomiCompanyName'
		| 'generation'
		| 'imAddresses'
		| 'jobTitle'
		| 'companyName'
		| 'department'
		| 'officeLocation'
		| 'profession'
		| 'businessHomePage'
		| 'assistantName'
		| 'manager'
		| 'homePhones'
		| 'mobilePhone'
		| 'businessPhones'
		| 'spouseName'
		| 'personalNotes'
		| 'children'
		| 'emailAddresses'
		| 'homeAddress'
		| 'businessAddress'
		| 'otherAddress'
	>;
};

/** List and search calendars */
export type MicrosoftOutlookV2ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
	/**
	 * The fields to add to the output
	 * @default []
	 */
	fields?: Array<
		| 'createdDateTime'
		| 'lastModifiedDateTime'
		| 'changeKey'
		| 'categories'
		| 'parentFolderId'
		| 'birthday'
		| 'fileAs'
		| 'displayName'
		| 'givenName'
		| 'initials'
		| 'middleName'
		| 'nickName'
		| 'surname'
		| 'title'
		| 'yomiGivenName'
		| 'yomiSurname'
		| 'yomiCompanyName'
		| 'generation'
		| 'imAddresses'
		| 'jobTitle'
		| 'companyName'
		| 'department'
		| 'officeLocation'
		| 'profession'
		| 'businessHomePage'
		| 'assistantName'
		| 'manager'
		| 'homePhones'
		| 'mobilePhone'
		| 'businessPhones'
		| 'spouseName'
		| 'personalNotes'
		| 'children'
		| 'emailAddresses'
		| 'homeAddress'
		| 'businessAddress'
		| 'otherAddress'
	>;
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
	 */
	subject?: string | Expression<string>;
	/**
	 * Message body content
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
	 * @default []
	 */
	fields?: Array<
		| 'bccRecipients'
		| 'body'
		| 'bodyPreview'
		| 'categories'
		| 'ccRecipients'
		| 'changeKey'
		| 'conversationId'
		| 'createdDateTime'
		| 'flag'
		| 'from'
		| 'hasAttachments'
		| 'importance'
		| 'inferenceClassification'
		| 'internetMessageId'
		| 'isDeliveryReceiptRequested'
		| 'isDraft'
		| 'isRead'
		| 'isReadReceiptRequested'
		| 'lastModifiedDateTime'
		| 'parentFolderId'
		| 'receivedDateTime'
		| 'replyTo'
		| 'sender'
		| 'sentDateTime'
		| 'subject'
		| 'toRecipients'
		| 'webLink'
	>;
	options?: Record<string, unknown>;
};

/** Send an existing email draft */
export type MicrosoftOutlookV2DraftSendConfig = {
	resource: 'draft';
	operation: 'send';
	draftId: ResourceLocatorValue;
	/**
	 * Comma-separated list of email addresses of recipients
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
	 * @default []
	 */
	fields?: Array<
		| 'allowNewTimeProposals'
		| 'attendees'
		| 'body'
		| 'bodyPreview'
		| 'categories'
		| 'changeKey'
		| 'createdDateTime'
		| 'end'
		| 'hasAttachments'
		| 'hideAttendees'
		| 'iCalUId'
		| 'importance'
		| 'isAllDay'
		| 'isCancelled'
		| 'isDraft'
		| 'isOnlineMeeting'
		| 'isOrganizer'
		| 'isReminderOn'
		| 'lastModifiedDateTime'
		| 'location'
		| 'locations'
		| 'onlineMeeting'
		| 'onlineMeetingProvider'
		| 'onlineMeetingUrl'
		| 'organizer'
		| 'originalEndTimeZone'
		| 'originalStartTimeZone'
		| 'recurrence'
		| 'reminderMinutesBeforeStart'
		| 'responseRequested'
		| 'responseStatus'
		| 'sensitivity'
		| 'seriesMasterId'
		| 'showAs'
		| 'start'
		| 'subject'
		| 'transactionId'
		| 'type'
		| 'webLink'
	>;
};

/** List and search calendars */
export type MicrosoftOutlookV2EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
	fromAllCalendars?: boolean | Expression<boolean>;
	calendarId: ResourceLocatorValue;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
	/**
	 * The fields to add to the output
	 * @default []
	 */
	fields?: Array<
		| 'allowNewTimeProposals'
		| 'attendees'
		| 'body'
		| 'bodyPreview'
		| 'categories'
		| 'changeKey'
		| 'createdDateTime'
		| 'end'
		| 'hasAttachments'
		| 'hideAttendees'
		| 'iCalUId'
		| 'importance'
		| 'isAllDay'
		| 'isCancelled'
		| 'isDraft'
		| 'isOnlineMeeting'
		| 'isOrganizer'
		| 'isReminderOn'
		| 'lastModifiedDateTime'
		| 'location'
		| 'locations'
		| 'onlineMeeting'
		| 'onlineMeetingProvider'
		| 'onlineMeetingUrl'
		| 'organizer'
		| 'originalEndTimeZone'
		| 'originalStartTimeZone'
		| 'recurrence'
		| 'reminderMinutesBeforeStart'
		| 'responseRequested'
		| 'responseStatus'
		| 'sensitivity'
		| 'seriesMasterId'
		| 'showAs'
		| 'start'
		| 'subject'
		| 'transactionId'
		| 'type'
		| 'webLink'
	>;
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
	/**
	 * The fields to add to the output
	 * @default []
	 */
	fields?: Array<
		| 'bccRecipients'
		| 'body'
		| 'bodyPreview'
		| 'categories'
		| 'ccRecipients'
		| 'changeKey'
		| 'conversationId'
		| 'createdDateTime'
		| 'flag'
		| 'from'
		| 'hasAttachments'
		| 'importance'
		| 'inferenceClassification'
		| 'internetMessageId'
		| 'isDeliveryReceiptRequested'
		| 'isDraft'
		| 'isRead'
		| 'isReadReceiptRequested'
		| 'lastModifiedDateTime'
		| 'parentFolderId'
		| 'receivedDateTime'
		| 'replyTo'
		| 'sender'
		| 'sentDateTime'
		| 'subject'
		| 'toRecipients'
		| 'webLink'
	>;
	filtersUI?: {
		values?: {
			filterBy?: 'filters' | 'search' | Expression<string>;
			search?: string | Expression<string>;
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
	 * @default []
	 */
	fields?: Array<
		| 'bccRecipients'
		| 'body'
		| 'bodyPreview'
		| 'categories'
		| 'ccRecipients'
		| 'changeKey'
		| 'conversationId'
		| 'createdDateTime'
		| 'flag'
		| 'from'
		| 'hasAttachments'
		| 'importance'
		| 'inferenceClassification'
		| 'internetMessageId'
		| 'isDeliveryReceiptRequested'
		| 'isDraft'
		| 'isRead'
		| 'isReadReceiptRequested'
		| 'lastModifiedDateTime'
		| 'parentFolderId'
		| 'receivedDateTime'
		| 'replyTo'
		| 'sender'
		| 'sentDateTime'
		| 'subject'
		| 'toRecipients'
		| 'webLink'
	>;
	options?: Record<string, unknown>;
};

/** List and search calendars */
export type MicrosoftOutlookV2MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
	/**
	 * The fields to add to the output
	 * @default []
	 */
	fields?: Array<
		| 'bccRecipients'
		| 'body'
		| 'bodyPreview'
		| 'categories'
		| 'ccRecipients'
		| 'changeKey'
		| 'conversationId'
		| 'createdDateTime'
		| 'flag'
		| 'from'
		| 'hasAttachments'
		| 'importance'
		| 'inferenceClassification'
		| 'internetMessageId'
		| 'isDeliveryReceiptRequested'
		| 'isDraft'
		| 'isRead'
		| 'isReadReceiptRequested'
		| 'lastModifiedDateTime'
		| 'parentFolderId'
		| 'receivedDateTime'
		| 'replyTo'
		| 'sender'
		| 'sentDateTime'
		| 'subject'
		| 'toRecipients'
		| 'webLink'
	>;
	filtersUI?: {
		values?: {
			filterBy?: 'filters' | 'search' | Expression<string>;
			search?: string | Expression<string>;
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
	 * @default false
	 */
	replyToSenderOnly?: boolean | Expression<boolean>;
	/**
	 * Message body content
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
	 */
	toRecipients: string | Expression<string>;
	/**
	 * The subject of the message
	 */
	subject?: string | Expression<string>;
	/**
	 * Message body content
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
	 */
	toRecipients: string | Expression<string>;
	subject: string | Expression<string>;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	formFields?: {
		values?: Array<{
			fieldName?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldName?: string | Expression<string>;
			fieldType?:
				| 'checkbox'
				| 'html'
				| 'date'
				| 'dropdown'
				| 'email'
				| 'file'
				| 'hiddenField'
				| 'number'
				| 'password'
				| 'radio'
				| 'text'
				| 'textarea'
				| Expression<string>;
			elementName?: string | Expression<string>;
			fieldName?: string | Expression<string>;
			placeholder?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			multiselect?: boolean | Expression<boolean>;
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			numberOfSelections?: number | Expression<number>;
			minSelections?: number | Expression<number>;
			maxSelections?: number | Expression<number>;
			html?: string | Expression<string>;
			multipleFiles?: boolean | Expression<boolean>;
			acceptFileTypes?: string | Expression<string>;
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
	approvalOptions?: {
		values?: {
			approvalType?: 'single' | 'double' | Expression<string>;
			approveLabel?: string | Expression<string>;
			buttonApprovalStyle?: 'primary' | 'secondary' | Expression<string>;
			disapproveLabel?: string | Expression<string>;
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type MicrosoftOutlookV2Params =
	| MicrosoftOutlookV2CalendarCreateConfig
	| MicrosoftOutlookV2CalendarDeleteConfig
	| MicrosoftOutlookV2CalendarGetConfig
	| MicrosoftOutlookV2CalendarGetAllConfig
	| MicrosoftOutlookV2CalendarUpdateConfig
	| MicrosoftOutlookV2ContactCreateConfig
	| MicrosoftOutlookV2ContactDeleteConfig
	| MicrosoftOutlookV2ContactGetConfig
	| MicrosoftOutlookV2ContactGetAllConfig
	| MicrosoftOutlookV2ContactUpdateConfig
	| MicrosoftOutlookV2DraftCreateConfig
	| MicrosoftOutlookV2DraftDeleteConfig
	| MicrosoftOutlookV2DraftGetConfig
	| MicrosoftOutlookV2DraftSendConfig
	| MicrosoftOutlookV2DraftUpdateConfig
	| MicrosoftOutlookV2EventCreateConfig
	| MicrosoftOutlookV2EventDeleteConfig
	| MicrosoftOutlookV2EventGetConfig
	| MicrosoftOutlookV2EventGetAllConfig
	| MicrosoftOutlookV2EventUpdateConfig
	| MicrosoftOutlookV2FolderCreateConfig
	| MicrosoftOutlookV2FolderDeleteConfig
	| MicrosoftOutlookV2FolderGetConfig
	| MicrosoftOutlookV2FolderGetAllConfig
	| MicrosoftOutlookV2FolderUpdateConfig
	| MicrosoftOutlookV2FolderMessageGetAllConfig
	| MicrosoftOutlookV2MessageDeleteConfig
	| MicrosoftOutlookV2MessageGetConfig
	| MicrosoftOutlookV2MessageGetAllConfig
	| MicrosoftOutlookV2MessageMoveConfig
	| MicrosoftOutlookV2MessageReplyConfig
	| MicrosoftOutlookV2MessageSendConfig
	| MicrosoftOutlookV2MessageSendAndWaitConfig
	| MicrosoftOutlookV2MessageUpdateConfig
	| MicrosoftOutlookV2MessageAttachmentAddConfig
	| MicrosoftOutlookV2MessageAttachmentDownloadConfig
	| MicrosoftOutlookV2MessageAttachmentGetConfig
	| MicrosoftOutlookV2MessageAttachmentGetAllConfig;

/** Create a new email draft */
export type MicrosoftOutlookV1DraftCreateConfig = {
	resource: 'draft';
	operation: 'create';
	/**
	 * The subject of the message
	 */
	subject?: string | Expression<string>;
	/**
	 * Message body content
	 */
	bodyContent?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a draft */
export type MicrosoftOutlookV1DraftDeleteConfig = {
	resource: 'draft';
	operation: 'delete';
	messageId: string | Expression<string>;
};

/** Get a single draft */
export type MicrosoftOutlookV1DraftGetConfig = {
	resource: 'draft';
	operation: 'get';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Send an existing draft message */
export type MicrosoftOutlookV1DraftSendConfig = {
	resource: 'draft';
	operation: 'send';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Update a draft */
export type MicrosoftOutlookV1DraftUpdateConfig = {
	resource: 'draft';
	operation: 'update';
	messageId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a new email draft */
export type MicrosoftOutlookV1FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
	/**
	 * Folder Type
	 * @default folder
	 */
	folderType?: 'folder' | 'searchFolder' | Expression<string>;
	/**
	 * Name of the folder
	 */
	displayName: string | Expression<string>;
	/**
	 * Whether to include child folders in the search
	 * @default false
	 */
	includeNestedFolders?: boolean | Expression<boolean>;
	/**
	 * The mailbox folders that should be mined
	 * @default []
	 */
	sourceFolderIds?: string | Expression<string>;
	/**
	 * The OData query to filter the messages
	 */
	filterQuery: string | Expression<string>;
};

/** Delete a draft */
export type MicrosoftOutlookV1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
	folderId: string | Expression<string>;
};

/** Get a single draft */
export type MicrosoftOutlookV1FolderGetConfig = {
	resource: 'folder';
	operation: 'get';
	folderId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Lists all child folders under the folder */
export type MicrosoftOutlookV1FolderGetChildrenConfig = {
	resource: 'folder';
	operation: 'getChildren';
	folderId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get many messages in the signed-in user's mailbox */
export type MicrosoftOutlookV1FolderGetAllConfig = {
	resource: 'folder';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get many messages in the signed-in user's mailbox */
export type MicrosoftOutlookV1FolderMessageGetAllConfig = {
	resource: 'folderMessage';
	operation: 'getAll';
	folderId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a draft */
export type MicrosoftOutlookV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	messageId: string | Expression<string>;
};

/** Get a single draft */
export type MicrosoftOutlookV1MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many messages in the signed-in user's mailbox */
export type MicrosoftOutlookV1MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get MIME content of a message */
export type MicrosoftOutlookV1MessageGetMimeConfig = {
	resource: 'message';
	operation: 'getMime';
	messageId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Move a message */
export type MicrosoftOutlookV1MessageMoveConfig = {
	resource: 'message';
	operation: 'move';
	messageId: string | Expression<string>;
	/**
	 * Target Folder ID
	 */
	folderId: string | Expression<string>;
};

/** Create reply to a message */
export type MicrosoftOutlookV1MessageReplyConfig = {
	resource: 'message';
	operation: 'reply';
	messageId: string | Expression<string>;
	replyType: 'reply' | 'replyAll' | Expression<string>;
	/**
	 * A comment to include. Can be an empty string.
	 */
	comment?: string | Expression<string>;
	/**
	 * Whether to send the reply message directly. If not set, it will be saved as draft.
	 * @default true
	 */
	send?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Send an existing draft message */
export type MicrosoftOutlookV1MessageSendConfig = {
	resource: 'message';
	operation: 'send';
	/**
	 * The subject of the message
	 */
	subject?: string | Expression<string>;
	/**
	 * Message body content
	 */
	bodyContent?: string | Expression<string>;
	/**
	 * Email addresses of recipients. Multiple can be added separated by comma.
	 */
	toRecipients: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Update a draft */
export type MicrosoftOutlookV1MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
	messageId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add an attachment to a message */
export type MicrosoftOutlookV1MessageAttachmentAddConfig = {
	resource: 'messageAttachment';
	operation: 'add';
	messageId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Download attachment content */
export type MicrosoftOutlookV1MessageAttachmentDownloadConfig = {
	resource: 'messageAttachment';
	operation: 'download';
	messageId: string | Expression<string>;
	attachmentId: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
};

/** Get a single draft */
export type MicrosoftOutlookV1MessageAttachmentGetConfig = {
	resource: 'messageAttachment';
	operation: 'get';
	messageId: string | Expression<string>;
	attachmentId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many messages in the signed-in user's mailbox */
export type MicrosoftOutlookV1MessageAttachmentGetAllConfig = {
	resource: 'messageAttachment';
	operation: 'getAll';
	messageId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type MicrosoftOutlookV1Params =
	| MicrosoftOutlookV1DraftCreateConfig
	| MicrosoftOutlookV1DraftDeleteConfig
	| MicrosoftOutlookV1DraftGetConfig
	| MicrosoftOutlookV1DraftSendConfig
	| MicrosoftOutlookV1DraftUpdateConfig
	| MicrosoftOutlookV1FolderCreateConfig
	| MicrosoftOutlookV1FolderDeleteConfig
	| MicrosoftOutlookV1FolderGetConfig
	| MicrosoftOutlookV1FolderGetChildrenConfig
	| MicrosoftOutlookV1FolderGetAllConfig
	| MicrosoftOutlookV1FolderMessageGetAllConfig
	| MicrosoftOutlookV1MessageDeleteConfig
	| MicrosoftOutlookV1MessageGetConfig
	| MicrosoftOutlookV1MessageGetAllConfig
	| MicrosoftOutlookV1MessageGetMimeConfig
	| MicrosoftOutlookV1MessageMoveConfig
	| MicrosoftOutlookV1MessageReplyConfig
	| MicrosoftOutlookV1MessageSendConfig
	| MicrosoftOutlookV1MessageUpdateConfig
	| MicrosoftOutlookV1MessageAttachmentAddConfig
	| MicrosoftOutlookV1MessageAttachmentDownloadConfig
	| MicrosoftOutlookV1MessageAttachmentGetConfig
	| MicrosoftOutlookV1MessageAttachmentGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOutlookV2Credentials {
	microsoftOutlookOAuth2Api: CredentialReference;
}

export interface MicrosoftOutlookV1Credentials {
	microsoftOutlookOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MicrosoftOutlookV2Node = {
	type: 'n8n-nodes-base.microsoftOutlook';
	version: 2;
	config: NodeConfig<MicrosoftOutlookV2Params>;
	credentials?: MicrosoftOutlookV2Credentials;
};

export type MicrosoftOutlookV1Node = {
	type: 'n8n-nodes-base.microsoftOutlook';
	version: 1;
	config: NodeConfig<MicrosoftOutlookV1Params>;
	credentials?: MicrosoftOutlookV1Credentials;
};

export type MicrosoftOutlookNode = MicrosoftOutlookV2Node | MicrosoftOutlookV1Node;
