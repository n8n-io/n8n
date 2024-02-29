/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { compare, genSaltSync, hash } from 'bcryptjs';
import { Container } from 'typedi';

import config from '@/config';
import { License } from '@/License';
import type { PostHogClient } from '@/posthog';
import { getWebhookBaseUrl } from '@/WebhookHelpers';

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
