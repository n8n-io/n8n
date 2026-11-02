import { isEnvFeatureEnabled } from '@n8n/backend-common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Pre-GA opt-in for SCIM. The `feat:scim` license activates the module, and
 * the `N8N_ENV_FEAT_SCIM` feature flag makes it available. The frontend reads
 * the same flag from `envFeatureFlags`.
 */
export const isScimAvailable = () => isEnvFeatureEnabled('N8N_ENV_FEAT_SCIM');

/**
 * Answers 404 while the opt-in is off. The SCIM routes and the SCIM REST
 * controller both use this gate.
 *
 * Rollback effect: when an instance that provisions users restarts with the
 * opt-in off, the identity provider gets 404 and provisioning stops.
 */
export const scimOptInGate = (_req: Request, res: Response, next: NextFunction): void => {
	if (isScimAvailable()) return next();

	res.status(404).send('Not found');
};
