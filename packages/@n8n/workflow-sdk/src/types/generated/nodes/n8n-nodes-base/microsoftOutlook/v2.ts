/**
 * Microsoft Outlook Node - Version 2
 * Consume Microsoft Outlook API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
	formFields?: {
		values?: Array<{
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [2.4] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"lt":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { fieldType: ["hiddenField"], @version: [{"_cnd":{"lt":2.4}}] }
			 */
			fieldName?: string | Expression<string>;
			/** The type of field to add to the form
			 * @default text
			 */
			fieldType?: 'checkbox' | 'html' | 'date' | 'dropdown' | 'email' | 'file' | 'hiddenField' | 'number' | 'password' | 'radio' | 'text' | 'textarea' | Expression<string>;
			/** Optional field. It can be used to include the html in the output.
			 * @displayOptions.show { fieldType: ["html"] }
			 */
			elementName?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.5}}] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Sample text to display inside the field
			 * @displayOptions.hide { fieldType: ["dropdown", "date", "file", "html", "hiddenField", "radio", "checkbox"] }
			 */
			placeholder?: string | Expression<string>;
			/** Default value that will be pre-filled in the form field
			 * @displayOptions.show { fieldType: ["text", "number", "email", "textarea"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default date value that will be pre-filled in the form field (format: YYYY-MM-DD)
			 * @displayOptions.show { fieldType: ["date"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value that will be pre-selected. Must match one of the option labels.
			 * @displayOptions.show { fieldType: ["dropdown", "radio"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value(s) that will be pre-selected. Must match one or multiple of the option labels. Separate multiple pre-selected options with a comma.
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Input value can be set here or will be passed as a query parameter via Field Name if no value is set
			 * @displayOptions.show { fieldType: ["hiddenField"] }
			 */
			fieldValue?: string | Expression<string>;
			/** List of options that can be selected from the dropdown
			 * @displayOptions.show { fieldType: ["dropdown"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
		values?: Array<{
			/** Option
			 */
			option?: string | Expression<string>;
		}>;
	};
			/** Checkboxes
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
		values?: Array<{
			/** Checkbox Label
			 */
			option?: string | Expression<string>;
		}>;
	};
			/** Radio Buttons
			 * @displayOptions.show { fieldType: ["radio"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
		values?: Array<{
			/** Radio Button Label
			 */
			option?: string | Expression<string>;
		}>;
	};
			/** Whether to allow the user to select multiple options from the dropdown list
			 * @displayOptions.show { fieldType: ["dropdown"], @version: [{"_cnd":{"lt":2.3}}] }
			 * @default false
			 */
			multiselect?: boolean | Expression<boolean>;
			/** Limit Selection
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default unlimited
			 */
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			/** Number of Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["exact"] }
			 * @default 1
			 */
			numberOfSelections?: number | Expression<number>;
			/** Minimum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 0
			 */
			minSelections?: number | Expression<number>;
			/** Maximum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 1
			 */
			maxSelections?: number | Expression<number>;
			/** HTML elements to display on the form page
			 * @hint Does not accept &lt;code&gt;&lt;script&gt;&lt;/code&gt;, &lt;code&gt;&lt;style&gt;&lt;/code&gt; or &lt;code&gt;&lt;input&gt;&lt;/code&gt; tags
			 * @displayOptions.show { fieldType: ["html"] }
			 * @default <!-- Your custom HTML here --->



			 */
			html?: string | Expression<string>;
			/** Whether to allow the user to select multiple files from the file input or just one
			 * @displayOptions.show { fieldType: ["file"] }
			 * @default true
			 */
			multipleFiles?: boolean | Expression<boolean>;
			/** Comma-separated list of allowed file extensions
			 * @hint Leave empty to allow all file types
			 * @displayOptions.show { fieldType: ["file"] }
			 */
			acceptFileTypes?: string | Expression<string>;
			/** Whether to require the user to enter a value for this field before submitting the form
			 * @displayOptions.hide { fieldType: ["html", "hiddenField"] }
			 * @default false
			 */
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
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
	| MicrosoftOutlookV2MessageAttachmentGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftOutlookV2Credentials {
	microsoftOutlookOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MicrosoftOutlookV2Node = {
	type: 'n8n-nodes-base.microsoftOutlook';
	version: 2;
	config: NodeConfig<MicrosoftOutlookV2Params>;
	credentials?: MicrosoftOutlookV2Credentials;
};