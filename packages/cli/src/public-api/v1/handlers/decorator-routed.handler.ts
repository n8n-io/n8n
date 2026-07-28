import type { RequestHandler } from 'express';

/**
 * Used as a stub for decorator-routed operations in the hand-coded OpenAPI spec.
 * These operations are routed by the runtime registry, not express-openapi-validator, so they don't have a real handler to point at.
 * The stub is required so express-openapi-validator's operation-handler installer doesn't error on them.
 * Example in `packages/cli/src/public-api/v1/handlers/tags/spec/paths/getTags.generated.yml`.
 */
export const unreachable: RequestHandler = (_req, res) => {
	res.status(500).json({
		message:
			'Unexpected: this operation should have been handled by PublicApiControllerRegistry before reaching express-openapi-validator',
	});
};
