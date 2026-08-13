import { z } from 'zod';

const ROOT = 'request/body';

/**
 * Decides whether a rejected key was published as `readOnly` rather than simply not published.
 * `path` is the object the key sat on, so a nested schema can answer differently from its parent.
 */
export type ReadOnlyFieldPredicate = (path: Array<string | number>, key: string) => boolean;

/**
 * Words a request body's rejections the way express-openapi-validator's ajv did.
 *
 * An endpoint served from the hand-written spec answers a malformed body with
 * `request/body/<path> must be <type>`. Validating with Zod instead produces entirely different
 * prose, so migrating an endpoint would change the 400 body its callers already read even though
 * nothing about what the endpoint accepts has changed. Only DTOs that took over from a
 * hand-written schema use this — an endpoint that never had one has no such wording to preserve.
 *
 * Pass it to `Z.class`, which applies it at parse time so it reaches nested objects and arrays too.
 */
export function createOpenApiRequestErrorMap(isReadOnly: ReadOnlyFieldPredicate): z.ZodErrorMap {
	return (issue, ctx) => ({ message: describe(issue, ctx.defaultError, isReadOnly) });
}

function locate(path: Array<string | number>): string {
	return path.length ? `${ROOT}/${path.join('/')}` : ROOT;
}

function describe(
	issue: z.ZodIssueOptionalMessage,
	defaultError: string,
	isReadOnly: ReadOnlyFieldPredicate,
): string {
	switch (issue.code) {
		case z.ZodIssueCode.invalid_type:
			if (issue.received === z.ZodParsedType.undefined && issue.path.length > 0) {
				const property = issue.path.at(-1);
				return `${locate(issue.path.slice(0, -1))} must have required property '${property}'`;
			}
			return `${locate(issue.path)} must be ${issue.expected}`;

		case z.ZodIssueCode.unrecognized_keys: {
			// ajv reported one error per request, so only the first offender is named.
			const readOnly = issue.keys.find((key) => isReadOnly(issue.path, key));
			return readOnly === undefined
				? `${locate(issue.path)} must NOT have additional properties`
				: `${locate([...issue.path, readOnly])} is read-only`;
		}

		case z.ZodIssueCode.invalid_enum_value:
			return `${locate(issue.path)} must be equal to one of the allowed values: ${issue.options.join(', ')}`;

		case z.ZodIssueCode.too_big:
			return issue.type === 'string'
				? `${locate(issue.path)} must NOT have more than ${issue.maximum} characters`
				: `${locate(issue.path)} ${defaultError}`;

		case z.ZodIssueCode.too_small:
			return issue.type === 'string'
				? `${locate(issue.path)} must NOT have fewer than ${issue.minimum} characters`
				: `${locate(issue.path)} ${defaultError}`;

		// A `format` the spec declared, checked by a refinement the schema attaches to the value.
		case z.ZodIssueCode.custom: {
			const format: unknown = issue.params?.format;
			return typeof format === 'string'
				? `${locate(issue.path)} must match format "${format}"`
				: `${locate(issue.path)} ${defaultError}`;
		}

		// ajv reported why every branch failed and then that none matched, rather than picking one.
		case z.ZodIssueCode.invalid_union:
			return [
				...issue.unionErrors.flatMap((branch) => {
					const first = branch.issues.at(0);
					return first ? [first.message] : [];
				}),
				`${locate(issue.path)} must match a schema in anyOf`,
			].join(', ');

		default:
			return `${locate(issue.path)} ${defaultError}`;
	}
}
