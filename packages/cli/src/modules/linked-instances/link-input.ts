import {
	LINKED_INSTANCE_INPUT_MESSAGES,
	linkedInstanceNameSchema,
	linkedInstanceRemoteProjectIdSchema,
	linkedInstanceTokenSchema,
	linkedInstanceUrlSchema,
} from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';

import { normaliseInstanceAddress, type InstanceAddressError } from './instance-address';

export type LinkInstanceInput = { name: string; address: string; token: string };

export type ParsedLinkInput = { name: string; origin: string; token: string };

export type LinkUpdateInput = { name?: string; token?: string; defaultRemoteProjectId?: string };

export const LINK_INPUT_MESSAGES = {
	name: LINKED_INSTANCE_INPUT_MESSAGES.name,
	token: LINKED_INSTANCE_INPUT_MESSAGES.token,
	defaultRemoteProjectId: LINKED_INSTANCE_INPUT_MESSAGES.defaultRemoteProjectId,
	noChange: 'Change the name, the access token or the default project.',
} as const;

export const ADDRESS_ERROR_MESSAGES: Record<InstanceAddressError, string> = {
	empty: 'Enter the address of the n8n instance.',
	invalid: LINKED_INSTANCE_INPUT_MESSAGES.url,
	'unsupported-protocol': 'Enter an address that starts with https://',
	'insecure-http':
		'Use https:// for this address. Plain http:// works only for an instance on this computer.',
	'has-credentials': 'Remove the user name and password from the address.',
};

function parseOrigin(address: unknown): string {
	const parsed = linkedInstanceUrlSchema.safeParse(address);
	if (!parsed.success) throw new BadRequestError(ADDRESS_ERROR_MESSAGES.invalid);
	const result = normaliseInstanceAddress(parsed.data);
	if (!result.ok) throw new BadRequestError(ADDRESS_ERROR_MESSAGES[result.error]);
	return result.origin;
}

/** @throws {BadRequestError} */
export function parseLinkName(name: unknown): string {
	const parsed = linkedInstanceNameSchema.safeParse(name);
	if (!parsed.success) throw new BadRequestError(LINK_INPUT_MESSAGES.name);
	return parsed.data;
}

/** @throws {BadRequestError} with a message that never repeats the token */
export function parseLinkToken(token: unknown): string {
	const parsed = linkedInstanceTokenSchema.safeParse(token);
	if (!parsed.success) throw new BadRequestError(LINK_INPUT_MESSAGES.token);
	return parsed.data;
}

/**
 * Checks and cleans what a user gives to link an instance.
 * The error messages never repeat the input, so they cannot leak the token.
 * @throws {BadRequestError}
 */
export function parseLinkInput(input: LinkInstanceInput): ParsedLinkInput {
	const name = parseLinkName(input.name);
	const origin = parseOrigin(input.address);
	const token = parseLinkToken(input.token);
	return { name, origin, token };
}

/**
 * Checks a change to a link. Leaves out the fields that the user did not send.
 * @throws {BadRequestError} when a field is not valid or nothing changes
 */
export function parseLinkUpdate(input: LinkUpdateInput): LinkUpdateInput {
	const update: LinkUpdateInput = {};
	if (input.name !== undefined) update.name = parseLinkName(input.name);
	if (input.token !== undefined) update.token = parseLinkToken(input.token);
	if (input.defaultRemoteProjectId !== undefined) {
		const projectId = linkedInstanceRemoteProjectIdSchema.safeParse(input.defaultRemoteProjectId);
		if (!projectId.success) throw new BadRequestError(LINK_INPUT_MESSAGES.defaultRemoteProjectId);
		update.defaultRemoteProjectId = projectId.data;
	}
	if (Object.keys(update).length === 0) throw new BadRequestError(LINK_INPUT_MESSAGES.noChange);
	return update;
}
