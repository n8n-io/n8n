import { z } from 'zod';

// The name shows in prompts and in the UI, so it has no markup or line breaks.
const NAME_PATTERN = /^[\p{L}\p{N} ._()-]+$/u;
// A header value can hold only visible ASCII characters.
const TOKEN_PATTERN = /^[\x21-\x7E]+$/;
// n8n project ids are nanoids or UUIDs. Other characters are not sent back to the instance.
const REMOTE_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const LINKED_INSTANCE_MAX_URL_LENGTH = 2048;

/** en-GB messages. They never repeat the input, so they cannot leak the token. */
export const LINKED_INSTANCE_INPUT_MESSAGES = {
	name: 'Enter a name of 1 to 64 characters. Use only letters, digits, spaces and these characters: - _ . ( )',
	url: 'That address is not valid. Check it and try again.',
	token:
		'Enter an access token of 1 to 4096 characters. Use only the letters A to Z, digits and symbols, without spaces or accented characters.',
	defaultRemoteProjectId: 'Choose a project that this access token can see in that instance.',
} as const;

const messages = LINKED_INSTANCE_INPUT_MESSAGES;

export const linkedInstanceNameSchema = z
	.string()
	.trim()
	.min(1, messages.name)
	.max(64, messages.name)
	.regex(NAME_PATTERN, messages.name);

/** Only the length: the server reads the address and names each problem in its own message. */
export const linkedInstanceUrlSchema = z.string().max(LINKED_INSTANCE_MAX_URL_LENGTH, messages.url);

export const linkedInstanceTokenSchema = z
	.string()
	.trim()
	.min(1, messages.token)
	.max(4096, messages.token)
	.regex(TOKEN_PATTERN, messages.token);

export const linkedInstanceRemoteProjectIdSchema = z
	.string()
	.min(1, messages.defaultRemoteProjectId)
	.max(36, messages.defaultRemoteProjectId)
	.regex(REMOTE_PROJECT_ID_PATTERN, messages.defaultRemoteProjectId);

export const LINKED_INSTANCE_STATUSES = [
	'online',
	'offline',
	'unauthorised',
	'mcp-disabled',
	'unknown',
] as const;

/** Result of the last check of a linked instance. */
export type LinkedInstanceStatus = (typeof LINKED_INSTANCE_STATUSES)[number];

/** A project on the linked instance, as that instance named it. */
export type LinkedInstanceRemoteProject = { id: string; name: string };

/** What a user can see of a linked instance. It never holds the access token. */
export type LinkedInstanceSummary = {
	id: string;
	name: string;
	baseUrl: string;
	status: LinkedInstanceStatus;
	lastVerifiedAt: string | null;
	createdAt: string;
	/** Where new automations go on the linked instance. `null` when the instance listed no project. */
	defaultRemoteProject: LinkedInstanceRemoteProject | null;
};
