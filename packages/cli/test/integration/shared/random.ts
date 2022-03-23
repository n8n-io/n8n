import { randomBytes } from 'crypto';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../../../src/databases/entities/User';

/**
 * Create a random alphanumeric string of random length between two limits, both inclusive.
 * Limits should be even numbers (round down otherwise).
 */
export function randomString(min: number, max: number) {
	const randomInteger = Math.floor(Math.random() * (max - min) + min) + 1;
	return randomBytes(randomInteger / 2).toString('hex');
}

const chooseRandomly = <T>(array: T[]) => array[Math.floor(Math.random() * array.length)];

const randomDigit = () => Math.floor(Math.random() * 10);

const randomUppercaseLetter = () => chooseRandomly('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

export const randomValidPassword = () =>
	randomString(MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH) + randomUppercaseLetter() + randomDigit();

export const randomInvalidPassword = () =>
	chooseRandomly([
		randomString(1, MIN_PASSWORD_LENGTH - 1),
		randomString(MAX_PASSWORD_LENGTH + 2, MAX_PASSWORD_LENGTH + 100),
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

export const randomName = () => randomString(4, 8);
