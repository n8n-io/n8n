import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoUnprotectedAxiosRule } from './no-unprotected-axios.js';

const ruleTester = new RuleTester();

ruleTester.run('no-unprotected-axios', NoUnprotectedAxiosRule, {
	valid: [
		// Type-only imports never make requests.
		{ code: "import type { AxiosInstance } from 'axios';" },
		{ code: "import { type AxiosRequestConfig } from 'axios';" },
		// Non-request members are allowed (error handling, type guards, helpers).
		{ code: "import axios from 'axios'; const isErr = axios.isAxiosError(error);" },
		{ code: "import axios from 'axios'; const uri = axios.getUri(config);" },
		// Instances created elsewhere (e.g. the factory) are not the raw default export.
		{ code: "const client = factory.create(); await client.get('https://example.com');" },
		// Unrelated identifiers named like methods.
		{ code: "import axios from 'axios'; const x = obj.get('key');" },
		// Files matched by the `allow` option are exempt (e.g. the factory itself).
		{
			code: "import axios from 'axios'; const client = axios.create();",
			filename: '/repo/packages/cli/src/services/ssrf/safe-axios.factory.ts',
			options: [{ allow: ['safe-axios.factory'] }],
		},
	],

	invalid: [
		{
			code: "import axios from 'axios'; await axios.get('https://example.com');",
			errors: [{ messageId: 'useFactory', data: { member: 'get' } }],
		},
		{
			code: "import axios from 'axios'; await axios.post(url, body);",
			errors: [{ messageId: 'useFactory', data: { member: 'post' } }],
		},
		{
			code: "import axios from 'axios'; const client = axios.create({ baseURL });",
			errors: [{ messageId: 'useFactory', data: { member: 'create' } }],
		},
		{
			code: "import axios from 'axios'; await axios.request(config);",
			errors: [{ messageId: 'useFactory', data: { member: 'request' } }],
		},
		{
			code: "import axios from 'axios'; await axios(config);",
			errors: [{ messageId: 'useFactory', data: { member: 'axios' } }],
		},
		// Renamed default import is still tracked.
		{
			code: "import http from 'axios'; await http.get('https://example.com');",
			errors: [{ messageId: 'useFactory', data: { member: 'get' } }],
		},
		// Namespace import is still tracked.
		{
			code: "import * as axios from 'axios'; await axios.get('https://example.com');",
			errors: [{ messageId: 'useFactory', data: { member: 'get' } }],
		},
	],
});
