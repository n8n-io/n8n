import { z } from 'zod';

export const SNIPPET_NAME_MAX_LENGTH = 50;
export const SNIPPET_CODE_MAX_LENGTH = 50_000;
export const SNIPPET_DESCRIPTION_MAX_LENGTH = 500;

// Must be a valid JS identifier: blocks are called as `$snippets.<name>(...)`
export const SNIPPET_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const snippetNameSchema = z
	.string()
	.min(1, 'name must be at least 1 character long')
	.max(SNIPPET_NAME_MAX_LENGTH, `name cannot be longer than ${SNIPPET_NAME_MAX_LENGTH} characters`)
	.regex(
		SNIPPET_NAME_REGEX,
		'name can only contain letters, numbers (not as first character), and underscores (A-Za-z0-9_)',
	);

export const snippetCodeSchema = z
	.string()
	.min(1, 'code must not be empty')
	.max(SNIPPET_CODE_MAX_LENGTH, `code cannot be longer than ${SNIPPET_CODE_MAX_LENGTH} characters`);

export const snippetDescriptionSchema = z
	.string()
	.max(
		SNIPPET_DESCRIPTION_MAX_LENGTH,
		`description cannot be longer than ${SNIPPET_DESCRIPTION_MAX_LENGTH} characters`,
	);

export const SNIPPET_TEST_CODE_MAX_LENGTH = 2000;
export const SNIPPET_MAX_TESTS = 50;

export const snippetTestSchema = z.object({
	code: z.string().min(1, 'test code must not be empty').max(SNIPPET_TEST_CODE_MAX_LENGTH),
	// Expression the code's result is deep-compared against; required
	expected: z
		.string()
		.min(1, 'test expected value must not be empty')
		.max(SNIPPET_TEST_CODE_MAX_LENGTH),
});

export const snippetTestsSchema = z
	.array(snippetTestSchema)
	.max(SNIPPET_MAX_TESTS, `a snippet cannot have more than ${SNIPPET_MAX_TESTS} tests`);
