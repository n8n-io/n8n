/**
 * User synchronization for Google SSO.
 *
 * Handles finding existing users or creating new ones when
 * they sign in via Google for the first time.
 *
 * Uses n8n's User repository via hook context (this.dbCollections.User).
 */

import { getConfig } from '../../config';
import { generateUserId, generateSsoPasswordHash, type N8nUser } from '../../utils/n8n-db';
import { getDepartmentByUserEmail, addUserToDepartment } from '../../departments';

interface GoogleUserInfo {
	email: string;
	firstName: string;
	lastName: string;
	googleId: string;
}

/**
 * Reference to n8n's User repository, set during hook initialization.
 * This avoids importing n8n's internal modules directly.
 */
let _userRepo: {
	findOne: (options: { where: Record<string, unknown> }) => Promise<N8nUser | null>;
	save: (entity: Partial<N8nUser>) => Promise<N8nUser>;
	update: (criteria: Record<string, unknown>, data: Partial<N8nUser>) => Promise<unknown>;
} | null = null;

/**
 * Initialize user-sync with n8n's User repository.
 * Called from the external hooks initialization.
 */
export function initUserSync(userRepo: typeof _userRepo): void {
	_userRepo = userRepo;
}

/**
 * Find existing user or create a new one for Google SSO login.
 *
 * Logic:
 * 1. Look up user by email in n8n's user table
 * 2. If found -> return existing user (update name if changed)
 * 3. If not found -> create new user with bcrypt password hash
 * 4. Optionally auto-assign to department based on email rules
 *
 * The returned user's `password` field is the bcrypt hash stored in DB,
 * which is needed for JWT hash computation:
 *   jwtHash = SHA256(email + ":" + bcryptHash).base64().substring(0, 10)
 */
export async function findOrCreateUser(googleUser: GoogleUserInfo): Promise<N8nUser | null> {
	if (!_userRepo) {
		console.error('[OmiGroup] User repository not initialized');
		return null;
	}

	const config = getConfig();

	try {
		// Try to find existing user by email
		let user = await _userRepo.findOne({
			where: { email: googleUser.email },
		});

		if (user) {
			// Update name if changed on Google side
			if (user.firstName !== googleUser.firstName || user.lastName !== googleUser.lastName) {
				await _userRepo.update(
					{ id: user.id },
					{
						firstName: googleUser.firstName,
						lastName: googleUser.lastName,
					},
				);
				user.firstName = googleUser.firstName;
				user.lastName = googleUser.lastName;
			}

			return user;
		}

		// Create new user with bcrypt-hashed random password
		const isAdmin = config.admin.emails.includes(googleUser.email.toLowerCase());
		const passwordHash = await generateSsoPasswordHash();

		const newUser: Partial<N8nUser> = {
			id: generateUserId(),
			email: googleUser.email,
			firstName: googleUser.firstName,
			lastName: googleUser.lastName,
			password: passwordHash,
			role: isAdmin ? 'global:admin' : 'global:member',
			disabled: false,
		};

		user = await _userRepo.save(newUser);

		console.log(
			`[OmiGroup] Created new user via Google SSO: ${user.email} (role: ${user.role})`,
		);

		// Try auto-assign to department
		try {
			const dept = getDepartmentByUserEmail(user.email);
			if (dept) {
				addUserToDepartment(dept.id, user.id, 'member');
				console.log(`[OmiGroup] Auto-assigned user ${user.email} to department: ${dept.name}`);
			}
		} catch (deptError) {
			// Non-fatal: department assignment can fail without blocking login
			console.warn('[OmiGroup] Department auto-assign failed:', deptError);
		}

		return user;
	} catch (err) {
		console.error('[OmiGroup] Error in findOrCreateUser:', err);
		return null;
	}
}
