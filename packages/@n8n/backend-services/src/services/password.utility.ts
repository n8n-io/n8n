import { Service as Utility } from '@n8n/di';
import { compare, hash } from 'bcryptjs';

const SALT_ROUNDS = 10;

// A valid bcrypt hash at SALT_ROUNDS of a discarded random value. It is used when
// no bcrypt hash is stored, so that a failed comparison costs the same for every input.
// The comparison result is never used, so the plaintext does not matter.
export const DUMMY_PASSWORD_HASH = '$2a$10$pRkShmgjprjbEGFpxARzY.QYDWw1oxo7oKBLusgTNvZeW1FiauuUG';

// Bcrypt hash format: $2x$NN$<53 base64 chars>, with a cost of 4 to 31. Accounts provisioned
// by SSO or token exchange store a placeholder instead, which bcryptjs rejects without doing any work.
const BCRYPT_HASH_RE = /^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;

@Utility()
export class PasswordUtility {
	async hash(plaintext: string) {
		return await hash(plaintext, SALT_ROUNDS);
	}

	async compare(plaintext: string, hashed: string | null) {
		// Stryker disable next-line ConditionalExpression: the regex rejects null as well, the null check is for typing
		if (hashed === null || !BCRYPT_HASH_RE.test(hashed)) {
			await compare(plaintext, DUMMY_PASSWORD_HASH);
			return false;
		}
		return await compare(plaintext, hashed);
	}
}
