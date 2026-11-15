import {
	RuleTester,
	type InvalidTestCase,
	type ValidTestCase,
} from '@typescript-eslint/rule-tester';

import { RequireRequestTargetRule } from './require-request-target.js';

const ruleTester = new RuleTester();

const IMPORTS = `import { requestPath, requestUrl } from 'n8n-workflow';
import type { RequestPath, RequestUrl, WithRequestTarget } from 'n8n-workflow';
`;

type MessageId = 'plainUrl' | 'dynamicBaseUrl' | 'unverifiableOptions';

const withImportsValid = (cases: Array<ValidTestCase<[]>>) =>
	cases.map((testCase) => ({ ...testCase, code: IMPORTS + testCase.code }));

const withImportsInvalid = (cases: Array<InvalidTestCase<MessageId, []>>) =>
	cases.map((testCase) => ({ ...testCase, code: IMPORTS + testCase.code }));

ruleTester.run('require-request-target', RequireRequestTargetRule, {
	valid: withImportsValid([
		{
			code: `const a = 'https://api.example.com';
const b = a;
const c = b;
this.helpers.httpRequest({ baseURL: c, url: requestPath\`items/\${id}\` });`,
		},
		{
			code: 'this.helpers.httpRequest({ baseURL: WHATSAPP_BASE_URL, url: requestPath`items/${id}` });',
		},
		{
			code: 'this.helpers.httpRequest({ baseURL: credentials.baseUrl, url: requestPath`items/${id}` });',
		},
		{
			code: 'this.helpers.httpRequest({ baseURL: "https://api.example.com", url: requestPath`items/${id}` });',
		},
		{
			code: `const base = 'https://api.example.com';
this.helpers.httpRequest({ baseURL: base, url: requestPath\`items/\${id}\` });`,
		},
		{
			code: `const defaults = { method: 'GET', url: requestUrl\`https://api.example.com/\${id}\` };
this.helpers.httpRequest({ ...defaults, qs: {} });`,
		},
		{
			code: 'this.helpers.httpRequest({ ...{ method: "GET" }, url: requestUrl`https://api.example.com/${id}` });',
		},
		{ code: 'this.helpers.httpRequest({ ["url"]: requestUrl`https://api.example.com/${id}` });' },
		{
			code: `import { requestPath as path } from 'n8n-workflow';
this.helpers.httpRequest({ baseURL, url: path\`items/\${id}\` });`,
		},
		{
			code: 'this.helpers.requestWithAuthenticationPaginated.call(this, { uri: requestUrl`https://api.example.com/${id}` }, 0, pagination, "cred");',
		},
		{ code: 'this.helpers.httpRequest({ url: requestUrl`https://api.example.com/${id}` });' },
		{
			code: "this.helpers.httpRequestWithAuthentication.call(this, 'cred', { baseURL, url: requestPath`items/${id}` });",
		},
		{ code: "this.helpers.requestOAuth2.call(this, 'cred', { uri: requestUrl`${base}/items` });" },
		{
			code: "this.helpers.requestWithAuthentication.call(this, 'cred', { uri: 'https://api.example.com/items' });",
		},
		{ code: 'this.helpers.httpRequest({ url: `https://api.example.com/items` });' },
		{ code: 'this.helpers.httpRequest({ url: cond ? requestPath`a/${id}` : "/b" });' },
		{ code: 'this.helpers.httpRequest({ url: requestPath`a/${id}` as RequestPath });' },
		{ code: 'helpers.httpRequest({ url: requestPath`a/${id}` });' },
		{ code: 'this.helpers.request(requestUrl`https://api.example.com/${id}`);' },
		{
			code: 'this.helpers.request("https://api.example.com/items", { uri: requestUrl`https://x.com/${id}` });',
		},
		{ code: 'this.helpers.httpRequest({ method: "GET", body: {} });' },
		{ code: 'foo.request({ url: `https://api.example.com/${id}` });' },
		{ code: 'this.other.httpRequest({ url: `https://api.example.com/${id}` });' },

		// A value built from a tag one hop back.
		{
			code: `const url = requestUrl\`https://api.example.com/\${id}\`;
this.helpers.httpRequest({ url });`,
		},
		// A parameter typed as a request target.
		{
			code: `function send(this: IExecuteFunctions, url: RequestUrl) {
	return this.helpers.httpRequest({ url });
}`,
		},
		{
			code: `function send(this: IExecuteFunctions, path?: RequestPath) {
	return this.helpers.httpRequest({ baseURL, url: path });
}`,
		},
		// Options held in a variable.
		{
			code: `const options = { url: requestUrl\`https://api.example.com/\${id}\` };
this.helpers.httpRequest(options);`,
		},
		{
			code: `const options: IRequestOptions = { method: 'GET' };
options.uri = requestUrl\`https://api.example.com/\${id}\`;
this.helpers.request(options);`,
		},
		// Options typed so that the compiler checks them.
		{
			code: `function send(this: IExecuteFunctions, options: WithRequestTarget<IHttpRequestOptions>) {
	return this.helpers.httpRequest(options);
}`,
		},
		{
			code: `const options: WithRequestTarget<IHttpRequestOptions> = build();
this.helpers.httpRequest(options);`,
		},
	]),
	invalid: [
		...withImportsInvalid([
			{
				code: `const a = \`\${host}/api\`;
const b = a;
const c = b;
const d = c;
const e = d;
const f = e;
const g = f;
this.helpers.httpRequest({ baseURL: g, url: requestPath\`items/\${id}\` });`,
				errors: [{ messageId: 'dynamicBaseUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ baseURL: `${base}/channels/${id}`, url: requestPath`members` });',
				errors: [{ messageId: 'dynamicBaseUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ baseURL: base + "/channels/" + id, url: requestPath`members` });',
				errors: [{ messageId: 'dynamicBaseUrl' }],
			},
			{
				code: `const base = \`\${host}/api\`;
this.helpers.httpRequest({ baseURL: base, url: requestPath\`members\` });`,
				errors: [{ messageId: 'dynamicBaseUrl' }],
			},
			{
				code: `const options = { url: requestPath\`members\` };
options.baseURL = \`\${host}/api\`;
this.helpers.httpRequest(options);`,
				errors: [{ messageId: 'dynamicBaseUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ ...options, method: "GET" });',
				errors: [{ messageId: 'unverifiableOptions' }],
			},
			{
				code: `const defaults = { url: \`https://api.example.com/\${id}\` };
this.helpers.httpRequest({ ...defaults, method: 'GET' });`,
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ ...{ url: `https://api.example.com/${id}` } });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ [key]: `https://api.example.com/${id}` });',
				errors: [{ messageId: 'unverifiableOptions' }],
			},
			{
				code: 'this.helpers.httpRequest({ ["url"]: `https://api.example.com/${id}` });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: `const options: WithRequestTarget<IHttpRequestOptions> = {
	baseURL,
	url: ('/items/' + id) as unknown as RequestPath,
};
this.helpers.httpRequest(options);`,
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: `const path: RequestPath = ('/items/' + id) as never;
this.helpers.httpRequest({ baseURL, url: path });`,
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ baseURL, url: requestPath(["/items/" + id] as never) });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.requestWithAuthenticationPaginated.call(this, { uri: `https://api.example.com/${id}` }, 0, pagination, "cred");',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ url: `https://api.example.com/${id}` });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: "this.helpers.httpRequest({ url: 'https://api.example.com/' + id });",
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: "this.helpers.requestWithAuthentication.call(this, 'cred', { uri: `${base}/items/${id}` });",
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: "this.helpers.httpRequestWithAuthentication.call(this, 'cred', { baseURL, url: `${phoneNumberId}/messages` });",
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: "this.helpers.requestOAuth1.call(this, 'cred', { uri: endpoint });",
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ url: tag`https://api.example.com/${id}` });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ url: cond ? `/a/${id}` : requestPath`b` });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ url: requestPath`a` || `/b/${id}` });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ url: options.url });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.httpRequest({ url: `/a/${id}` as string });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'helpers.httpRequest({ url: `/a/${id}` });',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.request(`https://api.example.com/${id}`);',
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: 'this.helpers.request("https://api.example.com/", { uri: `https://x.com/${id}` });',
				errors: [{ messageId: 'plainUrl' }],
			},

			// A value that is a plain string one hop back.
			{
				code: `const url = \`https://api.example.com/\${id}\`;
this.helpers.httpRequest({ url });`,
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: `function send(this: IExecuteFunctions, url: string) {
	return this.helpers.httpRequest({ url });
}`,
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: `function send(this: IExecuteFunctions, url) {
	return this.helpers.httpRequest({ url });
}`,
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: `let url = requestPath\`a\`;
url = \`/b/\${id}\`;
this.helpers.httpRequest({ url });`,
				errors: [{ messageId: 'plainUrl' }],
			},

			// Options held in a variable.
			{
				code: `const options = { url: \`https://api.example.com/\${id}\` };
this.helpers.httpRequest(options);`,
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: `const options: IRequestOptions = { method: 'GET' };
options.uri = \`https://api.example.com/\${id}\`;
this.helpers.request(options);`,
				errors: [{ messageId: 'plainUrl' }],
			},
			{
				code: `const options = { url: 'https://api.example.com/' };
options.url = base + path;
this.helpers.httpRequest(options);`,
				errors: [{ messageId: 'plainUrl' }],
			},

			// Options the rule cannot see.
			{
				code: 'this.helpers.httpRequest(buildOptions(id));',
				errors: [{ messageId: 'unverifiableOptions' }],
			},
			{
				code: `function send(this: IExecuteFunctions, options: IHttpRequestOptions) {
	return this.helpers.httpRequest(options);
}`,
				errors: [{ messageId: 'unverifiableOptions' }],
			},
			{
				code: `const options = buildOptions(id);
this.helpers.httpRequestWithAuthentication.call(this, 'cred', options);`,
				errors: [{ messageId: 'unverifiableOptions' }],
			},
			{
				code: 'this.helpers.request("https://api.example.com/", options);',
				errors: [{ messageId: 'unverifiableOptions' }],
			},
			{
				code: 'this.helpers.request(options);',
				errors: [{ messageId: 'unverifiableOptions' }],
			},

			// Two bad values report twice.
			{
				code: 'this.helpers.request({ uri: `/a/${id}`, url: `/b/${id}` });',
				errors: [{ messageId: 'plainUrl' }, { messageId: 'plainUrl' }],
			},
		]),

		{
			code: `import { requestPath } from './local';
this.helpers.httpRequest({ url: requestPath\`/items/\${id}\` });`,
			errors: [{ messageId: 'plainUrl' }],
		},
		{
			code: `const requestPath = (strings: TemplateStringsArray, ...values: string[]) => String.raw(strings, ...values);
this.helpers.httpRequest({ url: requestPath\`/items/\${id}\` });`,
			errors: [{ messageId: 'plainUrl' }],
		},
		{
			code: `import type { RequestPath } from './local';
function send(this: IExecuteFunctions, url: RequestPath) {
	return this.helpers.httpRequest({ url });
}`,
			errors: [{ messageId: 'plainUrl' }],
		},
	],
});
