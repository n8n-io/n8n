import { Container } from '@n8n/di';
import type { NextFunction, Request, Response } from 'express';

import { ScimConfig } from './scim.config';

/**
 * Pre-GA opt-in for SCIM. The `feat:scim` license activates the module, and
 * the `N8N_SCIM_OPT_IN` config switch makes it available. IAM-1565 removes
 * the opt-in at GA.
 */
export const isScimAvailable = () => Container.get(ScimConfig).optIn;

/**
 * Answers 404 while the opt-in is off. The SCIM routes and the SCIM REST
 * controller both use this gate.
 *
 * Rollback effect: when an instance that provisions users restarts with the
 * opt-in off, the identity provider gets 404 and provisioning stops. GA
 * (IAM-1565) decides the ramp-down rule.
 */
export const scimOptInGate = (_req: Request, res: Response, next: NextFunction): void => {
	if (isScimAvailable()) return next();

	res.status(404).send('Not found');
};
