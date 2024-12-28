import { compare, hash } from 'bcryptjs';
import { Service as Utility } from 'typedi';

const SALT_ROUNDS = 10;

@Utility()
export class PasswordUtility {
	async hash(plaintext: string) {
		return await hash(plaintext, SALT_ROUNDS);
	}

	async compare(plaintext: string, hashed: string) {
		return await compare(plaintext, hashed);
	}
}
