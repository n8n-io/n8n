# n8n community node

This package holds n8n nodes and credentials in the community node format, built with the `n8n-node` CLI.
This file is the complete reference for a programmatic node. `.agents/*.md` give background; you do not have to read them.

## Layout

- `nodes/<Name>/<Name>.node.ts`: `export class <Name> implements INodeType`. Next to it: the codex file
  `<Name>.node.json` and the icons `<name>.svg` and `<name>.dark.svg`.
- `credentials/<Name>Api.credentials.ts`: `export class <Name>Api implements ICredentialType`.
- `package.json` `n8n.nodes` and `n8n.credentials` list the built files (`dist/nodes/<Name>/<Name>.node.js`).
- `nodes/Example/` is an example. Move its icons and codex file to your folder with `mv`, then delete it.

## Commands

```sh
npx n8n-node build        # tsc to dist/, copies icons and codex files; must pass
npx n8n-node lint         # ESLint with the community rules; must pass. --fix fixes the autofixable rules
npx n8n-node dev          # starts n8n with the node; needs n8n from npm. Here, see "Test locally"
```

## Lint rules that fail first

- `package.json`: a real `description`, `homepage` (a URL) and `repository.url` (no `<...>`).
- Node description: `icon: { light: 'file:foo.svg', dark: 'file:foo.dark.svg' }`, `subtitle`, `usableAsTool: true`.
- Credential: `icon` (a path from `credentials/`), `documentationUrl` (a URL), `test` (a request that checks the key).
- Codex `categories`: `Development`, `Data & Storage`, `Productivity`, `Utility`, `Analytics`, `Communication`,
  `Sales`, `Marketing & Content`, `Finance & Accounting` or `Miscellaneous`.
- In a `catch` block, never `throw error`. Throw `new NodeApiError(...)` or `new NodeOperationError(...)`.
- A `limit` parameter defaults to 50. To keep another default, put
  `// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit` on the line above `default`.
- No `setTimeout`: use `await sleep(ms)` from `n8n-workflow`. Import only from `n8n-workflow`.

## Node and parameters

```ts
export class Foo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Foo', name: 'foo', icon: { light: 'file:foo.svg', dark: 'file:foo.dark.svg' }, group: ['input'],
		version: 1, subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', description: 'Use the Foo API',
		defaults: { name: 'Foo' }, usableAsTool: true, inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'fooApi', required: true }],
		properties: [
			{ displayName: 'Resource', name: 'resource', type: 'options', noDataExpression: true, options: [{ name: 'Item', value: 'item' }], default: 'item' },
			{ displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'getAll',
				displayOptions: { show: { resource: ['item'] } },
				options: [{ name: 'Get Many', value: 'getAll', action: 'Get many items', description: 'Get many items' }] },
			{ displayName: 'Limit', name: 'limit', type: 'number', typeOptions: { minValue: 1 }, default: 50,
				displayOptions: { show: { resource: ['item'], operation: ['getAll'], returnAll: [false] } } },
		],
	};
}
```

- An operation `item.getAll` is the two `options` parameters `resource` = `item` and `operation` = `getAll`.
- Types: `string`, `number`, `boolean`, `options` (`options: [{ name, value }]`, sorted by `name`), `collection`,
  `json`. `typeOptions: { password: true }` hides a value. Each parameter needs a `default`.
- `displayOptions.show` shows a field only for the listed values: every key must match one value of its array.
  Use it for fields that depend on a choice: `show: { operation: ['create'], mode: ['advanced'] }`.
- `this.getNodeParameter(name, i)` throws for a field that `displayOptions` hides. Read only the fields of the
  current choice, or give a fallback: `this.getNodeParameter('limit', i, 50)`. Convert values with `String()` or `Number()`.

## Credential

```ts
export class FooApi implements ICredentialType {
	name = 'fooApi'; displayName = 'Foo API'; documentationUrl = 'https://example.com/docs/foo';
	icon: Icon = { light: 'file:../nodes/Foo/foo.svg', dark: 'file:../nodes/Foo/foo.dark.svg' };
	properties: INodeProperties[] = [{ displayName: 'API Key', name: 'apiKey', type: 'string',
		typeOptions: { password: true }, required: true, default: '' }];
	// A value is '={{$credentials.<field>}}' with text around it. In the query: qs: { api_key: '={{$credentials.apiKey}}' }.
	authenticate: IAuthenticateGeneric = { type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } } };
	test: ICredentialTestRequest = { request: { baseURL: 'https://api.example.com/v1', url: '/me' } };
}
// Never read the credential in execute(): httpRequestWithAuthentication applies `authenticate` to each request.
```

## HTTP

```ts
const page = await this.helpers.httpRequestWithAuthentication.call(this, 'fooApi', {
	method: 'GET', url: `${BASE_URL}/items`, qs: { ...(status ? { status } : {}), pageSize: 50 }, json: true });
```

- It returns the parsed JSON body. `body: { ... }` with `json: true` sends JSON. To not send a field, leave the key out.
- `url` can be a full URL, e.g. a `next` link. `returnFullResponse: true` returns `{ body, headers, statusCode }`;
  header names are lower case (`headers.link`).
- A non-2xx response throws a `NodeApiError`. To read the status and the error body yourself, also set
  `ignoreHttpStatusErrors: true` and check `statusCode`. To retry, `await sleep(ms)` and send the request again.
- Paging: with `returnAll`, read to the last page. Else stop at `limit` and do not fetch a page you do not need.

## Errors and continue on fail

```ts
const returnData: INodeExecutionData[] = [];
for (let i = 0; i < this.getInputData().length; i++) {
	try {
		const { body, statusCode } = await this.helpers.httpRequestWithAuthentication.call(this, 'fooApi',
			{ method: 'POST', url, body: payload, json: true, returnFullResponse: true, ignoreHttpStatusErrors: true });
		if (statusCode >= 400) throw new NodeApiError(this.getNode(), body as JsonObject,
			{ message: 'A clear message', httpCode: String(statusCode), itemIndex: i });
		returnData.push({ json: body, pairedItem: { item: i } });
	} catch (error) {
		if (this.continueOnFail()) { returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } }); continue; }
		throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
	}
}
return [returnData];
```

- Without `message`, `NodeApiError` takes a generic message from the status ("Your request is invalid ...").
  `new NodeApiError(node, error)` of an error that is already a `NodeApiError` returns it unchanged.
- `new NodeOperationError(this.getNode(), 'message', { itemIndex: i })` is for errors that are not from the API.
- When the node throws while `continueOnFail()` is true, n8n passes the input items through. Emit the error item yourself.

## Test locally

Build, then run the node with this stand-in for n8n: `node scripts/try.cjs '{"resource":"item","operation":"getAll"}'`.
It has `getNodeParameter`, `continueOnFail` and `httpRequestWithAuthentication` (`url`, `qs`, `body`,
`returnFullResponse`, `ignoreHttpStatusErrors`). Lint and build skip `scripts/`.

```js
// scripts/try.cjs '<parameters JSON>' [continueOnFail]. Logs each request to stderr.
const { NodeApiError } = require('n8n-workflow');
const { Foo } = require('../dist/nodes/Foo/Foo.node.js');
const { FooApi } = require('../dist/credentials/FooApi.credentials.js');
const credential = { apiKey: 'sandbox_key' }, params = JSON.parse(process.argv[2] ?? '{}');
const node = { name: 'Foo', type: 'foo', typeVersion: 1, parameters: params };
const fill = (values = {}) => Object.fromEntries(Object.entries(values).map(([k, v]) =>
	[k, String(v).replace(/^=/, '').replace(/\{\{\s*\$credentials\.(\w+)\s*\}\}/g, (_, f) => credential[f])]));
async function request(o) {
	const { headers = {}, qs = {} } = new FooApi().authenticate.properties, url = new URL(o.url);
	for (const [k, v] of Object.entries({ ...o.qs, ...fill(qs) })) if (v !== undefined) url.searchParams.set(k, String(v));
	console.error('>', o.method ?? 'GET', url.href, o.body ? JSON.stringify(o.body) : '');
	const res = await fetch(url, { method: o.method ?? 'GET', body: o.body && JSON.stringify(o.body),
		headers: { 'content-type': 'application/json', ...o.headers, ...fill(headers) } });
	const text = await res.text(), body = text && /json/.test(res.headers.get('content-type')) ? JSON.parse(text) : text;
	if (!res.ok && !o.ignoreHttpStatusErrors) throw new NodeApiError(node, { message: text, httpCode: String(res.status) });
	return o.returnFullResponse ? { body, headers: Object.fromEntries(res.headers), statusCode: res.status } : body;
}
const context = { getInputData: () => [{ json: {} }], getNode: () => node,
	continueOnFail: () => process.argv[3] === 'continueOnFail',
	getNodeParameter: (name, _i, fallback) => { if (name in params) return params[name];
		if (fallback !== undefined) return fallback; throw new Error(`Could not get parameter ${name}`); },
	helpers: { httpRequest: request, httpRequestWithAuthentication: (_type, options) => request(options) } };
new Foo().execute.call(context).then(([items]) => console.log(JSON.stringify(items.map((i) => i.json), null, 1)),
	(error) => console.log('ERROR:', error.message, error.description ?? ''));
```
