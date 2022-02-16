import { randomBytes } from 'crypto';
import {
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
} from '../../../src/databases/entities/User';

/**
 * Create a random string of random length between two limits, both inclusive.
 */
export function randomString(min: number, max: number) {
	const randomInteger = Math.floor(Math.random() * (max - min) + min) + 1;
	return randomBytes(randomInteger / 2).toString('hex');
}

const chooseRandomly = <T>(array: T[]) => array[Math.floor(Math.random() * array.length)];

export const randomValidPassword = () => randomString(MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH);

export const randomInvalidPassword = () =>
	chooseRandomly([
		randomString(1, MIN_PASSWORD_LENGTH - 1),
		randomString(MAX_PASSWORD_LENGTH + 1, 100),
	]);

export const randomEmail = () => `${randomName()}@${randomName()}.${randomTopLevelDomain()}`;

const POPULAR_TOP_LEVEL_DOMAINS = ['com', 'org', 'net', 'io', 'edu'];

const randomTopLevelDomain = () => chooseRandomly(POPULAR_TOP_LEVEL_DOMAINS);

export const randomName = () => randomString(3, 7);
