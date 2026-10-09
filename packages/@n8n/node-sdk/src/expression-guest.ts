import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

import type * as host from './expression';

type HostExpressions = typeof host;

const isHostExpressions = (value: unknown): value is HostExpressions =>
	isRecord(value) &&
	typeof value.expressionOf === 'function' &&
	typeof value.scanExpression === 'function';

/**
 * The compiler of the host, when the host evaluates the bundle, e.g. pack, which writes the manifest
 * from what the bundle defines. A guest has no compiler and needs none: the host reads each lookup
 * and credential value from the manifest. So the SDK runtime carries no JavaScript parser.
 */
const hostExpressions = ((): HostExpressions | undefined => {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- a host module, see above
		const loaded: unknown = require('@n8n/node-sdk/expression');
		return isHostExpressions(loaded) ? loaded : undefined;
	} catch {
		return undefined;
	}
})();

/** `expression.ts` in the SDK runtime that bundles load. */
export const expressionOf: HostExpressions['expressionOf'] = (value, root, label) =>
	hostExpressions?.expressionOf(value, root, label) ?? (typeof value === 'string' ? value : '=');

export const scanExpression: HostExpressions['scanExpression'] = (expression, root) =>
	hostExpressions?.scanExpression(expression, root) ?? { reads: [], problems: [], roots: [] };

export const withRoot: HostExpressions['withRoot'] = (expression, from, to) =>
	hostExpressions?.withRoot(expression, from, to) ?? expression;

export const evaluated: HostExpressions['evaluated'] = (expression, data) => {
	if (!hostExpressions) throw new UnexpectedError('Only the host evaluates an expression');
	return hostExpressions.evaluated(expression, data);
};
