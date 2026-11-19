import { Service as Utility } from '@n8n/di';
import { compare, hash } from 'bcryptjs';

const SALT_ROUNDS = 10;

@Utility()
export class PasswordUtility {
	async hash(plaintext: string) {
		return await hash(plaintext, SALT_ROUNDS);
	}

	async compare(plaintext: string, hashed: string | null) {
		if (hashed === null) {
			return false;
		}
		return await compare(plaintext, hashed);
	}
}
