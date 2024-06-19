import { v4 as uuid } from 'uuid';
import { randomInt, randomString, UPPERCASE_LETTERS } from 'n8n-workflow';

import { MIN_PASSWORD_CHAR_LENGTH, MAX_PASSWORD_CHAR_LENGTH } from '@/constants';
import type { CredentialPayload } from './types';

export const randomApiKey = () => `n8n_api_${randomString(40)}`;

export const chooseRandomly = <T>(array: T[]) => array[randomInt(array.length)];

const randomUppercaseLetter = () => chooseRandomly(UPPERCASE_LETTERS.split(''));

export const randomValidPassword = () =>
	randomString(MIN_PASSWORD_CHAR_LENGTH, MAX_PASSWORD_CHAR_LENGTH - 2) +
	randomUppercaseLetter() +
	randomInt(10);

export const randomInvalidPassword = () =>
	chooseRandomly([
		randomString(1, MIN_PASSWORD_CHAR_LENGTH - 1),
		randomString(MAX_PASSWORD_CHAR_LENGTH + 2, MAX_PASSWORD_CHAR_LENGTH + 100),
		'abcdefgh', // valid length, no number, no uppercase
		'abcdefg1', // valid length, has number, no uppercase
		'abcdefgA', // valid length, no number, has uppercase
		'abcdefA', // invalid length, no number, has uppercase
		'abcdef1', // invalid length, has number, no uppercase
		'abcdeA1', // invalid length, has number, has uppercase
		'abcdefg', // invalid length, no number, no uppercase
	]);

export const randomEmail = () => `${randomName()}@${randomName()}.${randomTopLevelDomain()}`;

const POPULAR_TOP_LEVEL_DOMAINS = ['com', 'org', 'net', 'io', 'edu'];

const randomTopLevelDomain = () => chooseRandomly(POPULAR_TOP_LEVEL_DOMAINS);

export const randomName = () => randomString(4, 8).toLowerCase();

export const randomCredentialPayload = (): CredentialPayload => ({
	name: randomName(),
	type: randomName(),
	data: { accessToken: randomString(6, 16) },
});

export const uniqueId = () => uuid();
