/**
 * Previews of what an Agent would have done in a test run.
 *
 * In a test run, tool calls go to a simulation, so a write is never sent. These
 * types describe the already-extracted data that a preview card shows. The
 * caller maps a simulated tool call to one of these shapes. The cards do not
 * read node parameters.
 *
 * Every field except `kind` and `toolName` is optional, and the cards omit
 * missing or blank fields.
 */

/** The app that would have received the action, such as Gmail or Slack. */
export interface WouldHaveHappenedApp {
	/** Display name, such as `Gmail`. */
	name: string;
	/** Node type name, such as `n8n-nodes-base.gmail`. Used only to show the node icon. */
	nodeType?: string;
}

interface WouldHaveHappenedPreviewBase {
	/** The Agent tool name that the model called. */
	toolName: string;
	app?: WouldHaveHappenedApp;
}

export interface WouldHaveHappenedEmailPreview extends WouldHaveHappenedPreviewBase {
	kind: 'email';
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject?: string;
	/** Plain text. HTML or markdown shows as text. */
	body?: string;
}

export interface WouldHaveHappenedChatMessagePreview extends WouldHaveHappenedPreviewBase {
	kind: 'chatMessage';
	/** Channel name, such as `#support`. */
	channel?: string;
	/** Person for a direct message. */
	recipient?: string;
	/** Plain text. Markdown shows as text. */
	text?: string;
}

export interface WouldHaveHappenedIssuePreview extends WouldHaveHappenedPreviewBase {
	kind: 'issue';
	/** Project, team, board, or repository. */
	project?: string;
	title?: string;
	description?: string;
	assignee?: string;
	labels?: string[];
}

export interface WouldHaveHappenedTableRowPreview extends WouldHaveHappenedPreviewBase {
	kind: 'tableRow';
	/** Table or sheet name. */
	table?: string;
	columns: Record<string, unknown>;
}

export interface WouldHaveHappenedCalendarEventPreview extends WouldHaveHappenedPreviewBase {
	kind: 'calendarEvent';
	title?: string;
	/** ISO 8601 date-time or a display string. */
	start?: string;
	/** ISO 8601 date-time or a display string. */
	end?: string;
	location?: string;
	attendees?: string[];
	description?: string;
}

export interface WouldHaveHappenedGenericPreview extends WouldHaveHappenedPreviewBase {
	kind: 'generic';
	input: Record<string, unknown>;
}

export type WouldHaveHappenedPreview =
	| WouldHaveHappenedEmailPreview
	| WouldHaveHappenedChatMessagePreview
	| WouldHaveHappenedIssuePreview
	| WouldHaveHappenedTableRowPreview
	| WouldHaveHappenedCalendarEventPreview
	| WouldHaveHappenedGenericPreview;

export type WouldHaveHappenedPreviewKind = WouldHaveHappenedPreview['kind'];
