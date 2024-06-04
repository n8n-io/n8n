import { Container } from 'typedi';
import type { Response } from 'express';

import type { AuthUser } from '@db/entities/AuthUser';
import { AuthService } from './auth.service';

// This method is still used by cloud hooks.
// DO NOT DELETE until the hooks have been updated
/** @deprecated Use `AuthService` instead */
export function issueCookie(res: Response, user: AuthUser) {
	return Container.get(AuthService).issueCookie(res, user);
}
