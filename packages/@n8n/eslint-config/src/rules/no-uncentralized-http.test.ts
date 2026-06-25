import { RuleTester, type InvalidTestCase } from '@typescript-eslint/rule-tester';
import { NoUncentralizedHttpRule } from './no-uncentralized-http.js';

type MessageIds = 'useBackendNetwork' | 'addReviewedException';
type Options = [{ allow?: string[] }];

const ruleTester = new RuleTester({
	languageOptions: {
		parser: require('@typescript-eslint/parser'),
		parserOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
		},
	},
});

const runtimeFile = '/repo/packages/cli/src/service.ts';

const REVIEWED_EXCEPTION_COMMENT =
	'// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- TODO: explain why @n8n/backend-network cannot be used here';

const exceptionSuggestion = (code: string) => ({
	messageId: 'addReviewedException' as const,
	output: `${REVIEWED_EXCEPTION_COMMENT}\n${code}`,
});

const withSuggestions = (
	cases: Array<InvalidTestCase<MessageIds, Options>>,
): Array<InvalidTestCase<MessageIds, Options>> =>
	cases.map((testCase) => ({
		...testCase,
		errors: testCase.errors.map((error) => ({
			...error,
			suggestions: [exceptionSuggestion(testCase.code)],
		})),
	}));

ruleTester.run('no-uncentralized-http', NoUncentralizedHttpRule, {
	valid: [
		// Type-only imports carry no runtime behavior.
		{ code: "import type { AxiosRequestConfig } from 'axios';", filename: runtimeFile },
		{ code: "import { type AxiosRequestConfig } from 'axios';", filename: runtimeFile },
		{ code: "import type { Dispatcher } from 'undici';", filename: runtimeFile },
		// axios error/guard symbols perform no request.
		{ code: "import { AxiosError } from 'axios';", filename: runtimeFile },
		{ code: "import { isAxiosError, CanceledError } from 'axios';", filename: runtimeFile },
		// node http/https server primitives are unaffected; only `Agent` is restricted.
		{ code: "import { createServer } from 'node:http';", filename: runtimeFile },
		{ code: "import type { Agent } from 'node:https';", filename: runtimeFile },
		// Re-exporting a type, or a node-http namespace, carries no request behavior.
		{ code: "export type { AxiosRequestConfig } from 'axios';", filename: runtimeFile },
		{ code: "export { type Dispatcher } from 'undici';", filename: runtimeFile },
		{ code: "export { isAxiosError } from 'axios';", filename: runtimeFile },
		{ code: "export * from 'node:http';", filename: runtimeFile },
		// Dynamic import / require of unrelated or node-http modules.
		{ code: "const http = require('node:http');", filename: runtimeFile },
		{ code: "async function f() { await import('node:https'); }", filename: runtimeFile },
		{ code: "const lib = require('express');", filename: runtimeFile },
		// `import x = require(...)` — namespace binding; node-http parity and unrelated modules pass.
		{ code: "import http = require('node:http');", filename: runtimeFile },
		{ code: "import express = require('express');", filename: runtimeFile },
		// Unrelated modules.
		{ code: "import express from 'express';", filename: runtimeFile },
		{ code: "import { helper } from './local';", filename: runtimeFile },
		// Allow-listed file (reviewed exception).
		{
			code: "import axios from 'axios';",
			filename: '/repo/packages/cli/src/oauth/oauth.service.ts',
			options: [{ allow: ['packages/cli/src/oauth/oauth.service.ts'] }],
		},
		{
			code: "import { ProxyAgent } from 'undici';",
			filename: '/repo/packages/nodes-base/credentials/foo.ts',
			options: [{ allow: ['packages/nodes-base/'] }],
		},
		// Allow-list substrings (forward-slash) match on Windows backslash paths.
		{
			code: "import axios from 'axios';",
			filename: 'C:\\repo\\packages\\cli\\src\\oauth\\oauth.service.ts',
			options: [{ allow: ['packages/cli/src/oauth/oauth.service.ts'] }],
		},
		// Tests and fixtures import these libraries to mock them, not to call out.
		{ code: "import axios from 'axios';", filename: '/repo/packages/cli/src/service.test.ts' },
		{
			code: "import axios from 'axios';",
			filename: '/repo/packages/cli/src/__tests__/service.ts',
		},
		{
			code: "import axios from 'axios';",
			filename: '/repo/packages/@n8n/ai-utilities/integration-tests/openai.fixtures.ts',
		},
	],

	invalid: withSuggestions([
		{
			code: "import axios from 'axios';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork', data: { module: 'axios' } }],
		},
		{
			code: "import axios, { AxiosError } from 'axios';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork' }],
		},
		{
			code: "import * as axios from 'axios';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork' }],
		},
		{
			code: "import { request } from 'axios';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork' }],
		},
		{
			code: "import { ProxyAgent } from 'undici';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork', data: { module: 'undici' } }],
		},
		{
			code: "import { Agent } from 'undici';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork' }],
		},
		{
			code: "import { HttpsProxyAgent } from 'https-proxy-agent';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork' }],
		},
		{
			code: "import proxyFromEnv from 'proxy-from-env';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork' }],
		},
		{
			code: "import 'undici';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork' }],
		},
		{
			code: "import { Agent } from 'node:http';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork', data: { module: 'node:http' } }],
		},
		// Re-exports pull the client into consumers just like a direct import.
		{
			code: "export { request } from 'axios';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork', data: { module: 'axios' } }],
		},
		{
			code: "export * from 'undici';",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork', data: { module: 'undici' } }],
		},
		// Dynamic import / require load the whole client at runtime.
		{
			code: "async function f() { await import('axios'); }",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork', data: { module: 'axios' } }],
		},
		{
			code: "const { ProxyAgent } = require('undici');",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork', data: { module: 'undici' } }],
		},
		// `import x = require('axios')` — TS import-equals form loads the client.
		{
			code: "import axios = require('axios');",
			filename: runtimeFile,
			errors: [{ messageId: 'useBackendNetwork', data: { module: 'axios' } }],
		},
	]).concat([
		// Indented callsite: the quick-fix preserves indentation on the inserted line.
		{
			code: 'function f() {\n\tconst x = require("axios");\n}',
			filename: runtimeFile,
			errors: [
				{
					messageId: 'useBackendNetwork',
					data: { module: 'axios' },
					suggestions: [
						{
							messageId: 'addReviewedException',
							output:
								'function f() {\n\t// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- TODO: explain why @n8n/backend-network cannot be used here\n\tconst x = require("axios");\n}',
						},
					],
				},
			],
		},
	]),
});
