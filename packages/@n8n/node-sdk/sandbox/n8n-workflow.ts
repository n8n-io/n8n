// What the guest build takes from `n8n-workflow`. The package does not run in the JS engine
// of the guest, so these are the plain forms. The sandbox CPU limit stops a slow regex.

export class UserError extends Error {}

export class OperationalError extends Error {}

export class UnexpectedError extends Error {}

export const safeRegex = {
	exec: (pattern: string, input: string, flags?: string) => new RegExp(pattern, flags).exec(input),
	test: (pattern: string, input: string, flags?: string) => new RegExp(pattern, flags).test(input),
	replace: (pattern: string, input: string, flags: string | undefined, replacement: string) =>
		input.replace(new RegExp(pattern, flags), replacement),
	matchAll: (pattern: string, input: string, flags?: string) => [
		...input.matchAll(new RegExp(pattern, flags?.includes('g') ? flags : `${flags ?? ''}g`)),
	],
	split: (pattern: string, input: string, flags?: string) =>
		input.split(new RegExp(pattern, flags)),
};
