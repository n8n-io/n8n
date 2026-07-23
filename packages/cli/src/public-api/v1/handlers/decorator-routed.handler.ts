import type { RequestHandler } from 'express';

/**
 * express-openapi-validator's operation-handler installer (its own default resolver in
 * production, and our Vitest-only `importOperationHandlerResolver` — see `public-api/index.ts`)
 * walks every operation in the bundled spec and requires a resolvable `x-eov-operation-handler`
 * for each one; there's no way to tell it "this operation is routed elsewhere, skip it." Without
 * this, generating a spec fragment for a route that's actually served by
 * `PublicApiControllerRegistry` (mounted earlier in the chain, so eov never reaches it for real
 * traffic) breaks eov's handler installation for the *entire* document — every other, unrelated
 * eov-routed endpoint fails too, not just the decorator-routed one.
 *
 * So every decorator-routed operation gets `x-eov-operation-id: 'unreachable'` +
 * `x-eov-operation-handler` pointing here (see `openapi-gen/decorator-routes.ts`) purely to
 * satisfy that requirement. This handler should never actually run.
 */
const unreachable: RequestHandler = (_req, res) => {
	res.status(500).json({
		message:
			'Unexpected: this operation should have been handled by PublicApiControllerRegistry before reaching express-openapi-validator',
	});
};

const handlers: Record<string, RequestHandler> = { unreachable };

export = handlers;
