import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { AuthService } from './auth.service';

// This method is still used by cloud hooks.
// DO NOT DELETE until the hooks have been updated
/** @deprecated Use `AuthService` instead */
export function issueCookie(res: Response, user: User) {
	// TODO: The information on user has mfa enabled here, is missing!!
	// This could be a security problem!!
	// This is in just for the hackmation!!
	return Container.get(AuthService).issueCookie(res, user, user.mfaEnabled);
}
