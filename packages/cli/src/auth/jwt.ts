import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { AuthenticationService } from './authentication-service';

// This method is still used by cloud hooks.
// DO NOT DELETE until the hooks have been updated
/** @deprecated Use `AuthService` instead */
export function issueCookie(res: Response, user: User) {
	return Container.get(AuthenticationService).issueCookie(res, user, user.mfaEnabled);
}
