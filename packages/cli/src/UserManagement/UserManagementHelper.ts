/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { compare, genSaltSync, hash } from 'bcryptjs';
import { Container } from 'typedi';

import config from '@/config';
import type { User } from '@db/entities/User';
import { License } from '@/License';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { getWebhookBaseUrl } from '@/WebhookHelpers';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@db/entities/User';
import type { CurrentUser, PublicUser, WhereClause } from '@/Interfaces';
import { PostHogClient } from '@/posthog';
export function isEmailSetUp(): boolean {
	const smtp = config.getEnv('userManagement.emails.mode') === 'smtp';
	const host = !!config.getEnv('userManagement.emails.smtp.host');
	const user = !!config.getEnv('userManagement.emails.smtp.auth.user');
	const pass = !!config.getEnv('userManagement.emails.smtp.auth.pass');

	return smtp && host && user && pass;
}

export function isUserManagementEnabled(): boolean {
	// This can be simplified but readability is more important here

	if (config.getEnv('userManagement.isInstanceOwnerSetUp')) {
		// Short circuit - if owner is set up, UM cannot be disabled.
		// Users must reset their instance in order to do so.
		return true;
	}
	// UM is disabled for desktop by default
	if (config.getEnv('deployment.type').startsWith('desktop_')) {
		return false;
	}
	// if (!config.getEnv('userManagement.disabled')) {
	// 	return true;
	// } else {
	// 	return false;
	// }

	return true;
}

/**
 * Remove sensitive properties from the user to return to the client.
 */
export function sanitizeUser(user: User, withoutKeys?: string[]): PublicUser {
	const { password, updatedAt, apiKey, authIdentities, ...rest } = user;
	if (withoutKeys) {
		withoutKeys.forEach((key) => {
			// @ts-ignore
			delete rest[key];
		});
	}
	const sanitizedUser: PublicUser = {
		...rest,
		signInType: 'email',
		hasRecoveryCodesLeft: true,
	};
	const ldapIdentity = authIdentities?.find((i) => i.providerType === 'ldap');
	if (ldapIdentity) {
		sanitizedUser.signInType = 'ldap';
	}
	return sanitizedUser;
}

/**
 * Return the n8n instance base URL without trailing slash.
 */
export function getInstanceBaseUrl(): string {
	const n8nBaseUrl = config.getEnv('editorBaseUrl') || getWebhookBaseUrl();

	return n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, n8nBaseUrl.length - 1) : n8nBaseUrl;
}

export function isSharingEnabled(): boolean {
	const license = Container.get(License);
	return isUserManagementEnabled() && license.isSharingEnabled();
}

export function generateUserInviteUrl(inviterId: string, inviteeId: string): string {
	return `${getInstanceBaseUrl()}/signup?inviterId=${inviterId}&inviteeId=${inviteeId}`;
}

export async function withFeatureFlags(
	postHog: PostHogClient | undefined,
	user: CurrentUser,
): Promise<CurrentUser> {
	if (!postHog) {
		return user;
	}

	// native PostHog implementation has default 10s timeout and 3 retries.. which cannot be updated without affecting other functionality
	// https://github.com/PostHog/posthog-js-lite/blob/a182de80a433fb0ffa6859c10fb28084d0f825c2/posthog-core/src/index.ts#L67
	const timeoutPromise = new Promise<CurrentUser>((resolve) => {
		setTimeout(() => {
			resolve(user);
		}, 1500);
	});

	const fetchPromise = new Promise<CurrentUser>(async (resolve) => {
		user.featureFlags = await postHog.getFeatureFlags(user);
		resolve(user);
	});

	return Promise.race([fetchPromise, timeoutPromise]);
}

// ----------------------------------
//            hashing
// ----------------------------------

export const hashPassword = async (validPassword: string): Promise<string> =>
	hash(validPassword, genSaltSync(10));

export async function compareHash(plaintext: string, hashed: string): Promise<boolean | undefined> {
	try {
		return await compare(plaintext, hashed);
	} catch (error) {
		if (error instanceof Error && error.message.includes('Invalid salt version')) {
			error.message +=
				'. Comparison against unhashed string. Please check that the value compared against has been hashed.';
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		throw new Error(error);
	}
}

// TODO: Enforce at model level
export function validatePassword(password?: string): string {
	if (!password) {
		throw new BadRequestError('Password is mandatory');
	}

	const hasInvalidLength =
		password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH;

	const hasNoNumber = !/\d/.test(password);

	const hasNoUppercase = !/[A-Z]/.test(password);

	if (hasInvalidLength || hasNoNumber || hasNoUppercase) {
		const message: string[] = [];

		if (hasInvalidLength) {
			message.push(
				`Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters long.`,
			);
		}

		if (hasNoNumber) {
			message.push('Password must contain at least 1 number.');
		}

		if (hasNoUppercase) {
			message.push('Password must contain at least 1 uppercase letter.');
		}

		throw new BadRequestError(message.join(' '));
	}

	return password;
}
