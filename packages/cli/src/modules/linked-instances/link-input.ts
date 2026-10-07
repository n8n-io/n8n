import { BadRequestError } from '@n8n/errors';
import { z } from 'zod';

import { normaliseInstanceAddress, type InstanceAddressError } from './instance-address';

export type LinkInstanceInput = { name: string; address: string; token: string };

export type ParsedLinkInput = { name: string; origin: string; token: string };

// The name shows in prompts and in the UI, so it has no markup or line breaks.
const NAME_PATTERN = /^[\p{L}\p{N} ._()-]+$/u;
// A header value can hold only visible ASCII characters.
const TOKEN_PATTERN = /^[\x21-\x7E]+$/;
const MAX_ADDRESS_LENGTH = 2048;

const nameSchema = z.string().trim().min(1).max(64).regex(NAME_PATTERN);
const tokenSchema = z.string().trim().min(1).max(4096).regex(TOKEN_PATTERN);
const addressSchema = z.string().max(MAX_ADDRESS_LENGTH);

export const LINK_INPUT_MESSAGES = {
	name: 'Enter a name of 1 to 64 characters. Use only letters, digits, spaces and these characters: - _ . ( )',
	token:
		'Enter an access token of 1 to 4096 characters. Use only the letters A to Z, digits and symbols, without spaces or accented characters.',
} as const;

export const ADDRESS_ERROR_MESSAGES: Record<InstanceAddressError, string> = {
	empty: 'Enter the address of the n8n instance.',
	invalid: 'That address is not valid. Check it and try again.',
	'unsupported-protocol': 'Enter an address that starts with https://',
	'insecure-http':
		'Use https:// for this address. Plain http:// works only for an instance on this computer.',
	'has-credentials': 'Remove the user name and password from the address.',
};

function parseOrigin(address: unknown): string {
	const parsed = addressSchema.safeParse(address);
	if (!parsed.success) throw new BadRequestError(ADDRESS_ERROR_MESSAGES.invalid);
	const result = normaliseInstanceAddress(parsed.data);
	if (!result.ok) throw new BadRequestError(ADDRESS_ERROR_MESSAGES[result.error]);
	return result.origin;
}

/**
 * Checks and cleans what a user gives to link an instance.
 * The error messages never repeat the input, so they cannot leak the token.
 * @throws {BadRequestError}
 */
export function parseLinkInput(input: LinkInstanceInput): ParsedLinkInput {
	const name = nameSchema.safeParse(input.name);
	if (!name.success) throw new BadRequestError(LINK_INPUT_MESSAGES.name);
	const origin = parseOrigin(input.address);
	const token = tokenSchema.safeParse(input.token);
	if (!token.success) throw new BadRequestError(LINK_INPUT_MESSAGES.token);
	return { name: name.data, origin, token: token.data };
}
