import type { ExpressionService } from './service';

export type { RuntimeShape } from './service';

let service: Promise<ExpressionService> | undefined;

/**
 * One language service per process: a cold start parses the TS lib and luxon types. This
 * package's own `typescript` is 7.x, which has no JS language-service API, so load TS 6.
 */
export async function getExpressionService(): Promise<ExpressionService> {
	service ??= Promise.all([import('@typescript/typescript6'), import('./service.js')]).then(
		([ts, { createExpressionService }]) => createExpressionService({ ts, root: __dirname }),
	);
	return await service;
}
