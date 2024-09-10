import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { Service as Utility } from 'typedi';
import { compare, hash } from 'bcryptjs';
import {
	MAX_PASSWORD_CHAR_LENGTH as maxLength,
	MIN_PASSWORD_CHAR_LENGTH as minLength,
} from '@/constants';

const SALT_ROUNDS = 10;

@Utility()
export class PasswordUtility {
	async hash(plaintext: string) {
		return await hash(plaintext, SALT_ROUNDS);
	}

	async compare(plaintext: string, hashed: string) {
		return await compare(plaintext, hashed);
	}

	validate(plaintext?: string) {
		if (!plaintext) throw new BadRequestError('Password is mandatory');

		const errorMessages: string[] = [];

		if (plaintext.length < minLength || plaintext.length > maxLength) {
			errorMessages.push(`Password must be ${minLength} to ${maxLength} characters long.`);
		}

		if (!/\d/.test(plaintext)) {
			errorMessages.push('Password must contain at least 1 number.');
		}

		if (!/[A-Z]/.test(plaintext)) {
			errorMessages.push('Password must contain at least 1 uppercase letter.');
		}

		if (errorMessages.length > 0) {
			throw new BadRequestError(errorMessages.join(' '));
		}

		return plaintext;
	}
}
