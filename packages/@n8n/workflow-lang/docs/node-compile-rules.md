# Node compiler rules

The node compiler compiles the TypeScript source of an n8n node for one node
instance: one resource, one operation and one set of parameter values. When it
cannot prove that a construct has an equal compiled form, it stops with an
error. This catalogue has one entry for each error code.

Check a node with the linter:

```bash
node packages/@n8n/workflow-lang/src/cli.ts lint-node <X.node.ts | built package> [--json] [--operation resource.operation] [--version <n>|all]
```

The linter compiles each resource and operation of the node with the required
parameters set. It prints a verdict for each operation, and for each failure
`file:line:col CODE message` and the fix. The exit code is 1 when an operation
does not compile. Build the package first: the linter reads the node
description from the built class and the code from the TypeScript source.

Read the result correctly:

- "Compiles" is not "proven equal to v1". An operation runs compiled only when
  it is also in the verified list (`scripts/verify-compiled-nodes.ts`). That is
  a separate gate.
- "Does not compile" is not a failure at run time. The operation runs in the
  fallback host, as before.
- The linter checks one set of parameter values for each operation. Optional
  parameters and expressions can reach code that the linter did not compile.
- The location is the TypeScript source. The compiler does not keep source
  positions, so the linter finds the construct in the function that the
  compiler names. The output says when the location is only the function.

Entries with **Not supported by decision** are constructs that the project
decided not to compile. Restructure the code, or accept that the node needs a
native version and runs in the fallback host until then.

The rules are in `src/node-compile/diagnostics.ts`. A test fails when the
compiler gets a new error message without a rule, or a rule without an entry
here.

## NC001 A package without a compiled form

**Not supported by decision** for these packages: database and protocol
drivers (`pg`, `pg-promise`, `mysql2`, `mssql`, `mongodb`, `redis`, `ssh2`,
and others), XML parsers (`xml2js`), and `randomBytes` of `crypto` (random
bytes for secrets). These nodes need a native version.

- Cannot compile: a name that the code imports from an npm package.
- Why: the compiler reads source code, and it has a built-in form for a short
  list of packages only.
- Rewrite: use plain TypeScript in a file of the node, or
  `this.helpers.httpRequest` for HTTP. Packages with a compiled form:
  some `n8n-workflow` helpers (for example `NodeOperationError`, `jsonParse`,
  `sleep`, `randomInt`), `moment-timezone`, `luxon` (`DateTime`),
  `change-case`, `uuid` (`v4`), and `randomUUID` and `randomInt` of `crypto`.

```ts
// Before
import get from 'lodash/get';
const id = get(item.json, 'user.id');

// After
const id = item.json.user?.id;
```

## NC002 A name that the compiler cannot find

- Cannot compile: a name with no top-level declaration in a file of the node,
  a node class without `execute`, or a node without source.
- Why: the compiler links each name to a function, a class or a constant at
  the top level of a module.
- Rewrite: declare the name at the top level and import it with a relative
  path.

```ts
// Before
const { buildBody } = require('./body');

// After
import { buildBody } from './body';
```

## NC003 Two declarations with one name

- Cannot compile: two linked files that each declare a top-level function or
  class with the same name.
- Why: the compiler puts all linked declarations into one module.
- Rewrite: rename one declaration.

```ts
// Before: both v1/helpers.ts and v2/helpers.ts export `apiRequest`, and one operation links both.

// After
export async function apiRequestV2(this: IExecuteFunctions) {}
```

## NC004 A compiler limit

- Cannot compile: more than 2,000 linked declarations, code that still changes
  after the maximum number of fold rounds, or too many credential conditions
  or token requests.
- Why: fixed limits keep the time and the memory of a compile bounded.
- Rewrite: link fewer modules from `execute`. Import the function that the
  operation needs, not a file that imports everything.

```ts
// Before
import * as everything from './actions';

// After
import { createUser } from './actions/user/create';
```

## NC010 `this` used as a value

**Not supported by decision**: `const self = this` and other stored copies of
the context.

- Cannot compile: `this` that the code stores, returns, or passes to a method
  of an object.
- Why: the n8n context has a compiled form only as the receiver of a call, or
  as the `this` of a function that the compiler can see.
- Rewrite: call `this.method(...)` directly. Pass the context with
  `helper.call(this, ...)` to a top-level function. Use arrow functions for
  callbacks.

```ts
// Before
const self = this;
items.forEach(function (item) { self.logger.debug(item.json.id); });

// After
for (const item of items) await send.call(this, item);
```

## NC011 A context method without a compiled form

- Cannot compile: a `this.*` method that has no equal operation in the
  compiled engine, for example `this.putExecutionToWait`,
  `this.getWorkflowStaticData`, `this.evaluateExpression`, `this.logger`.
- Why: each context method needs an operation in the engine that gives the
  same result as n8n.
- Rewrite: use `getNodeParameter`, `getInputData`, `getCredentials`,
  `getNode`, `continueOnFail`, and the `helpers` for requests, JSON arrays,
  execution metadata and binary data. If the operation needs the method, the
  operation stays in the fallback host.

```ts
// Before
this.logger.debug('sending');
const response = await this.helpers.httpRequest(options);

// After
const response = await this.helpers.httpRequest(options);
```

## NC012 A context call with an unknown target

**Not supported by decision**: closure factories and computed handler lookups
that get the context.

- Cannot compile: `something.call(this, ...)` where `something` is not a name
  of a top-level function.
- Why: the compiler must know at compile time which function runs with the
  context.
- Rewrite: name each function in a `switch` or an `if` chain.

```ts
// Before
return await handlers[item.json.kind].call(this, item);

// After
if (item.json.kind === 'user') return await handleUser.call(this, item);
return await handleGroup.call(this, item);
```

## NC013 A function that gets the context in one call and not in another

- Cannot compile: a function that one call gives the context, a credential or
  an object of a class, and a different call does not.
- Why: the compiler makes one compiled form for each function.
- Rewrite: call the function the same way everywhere, or split it.

```ts
// Before
await apiRequest.call(this, 'GET', '/users');
await apiRequest('GET', '/groups');

// After
await apiRequest.call(this, 'GET', '/users');
await apiRequest.call(this, 'GET', '/groups');
```

## NC014 A value of the instance that the caller did not give

- Cannot compile: code that reads the instance id or uses dates in a time
  zone, when the caller of the compiler did not pass the instance id or the
  workflow time zone.
- Why: these values become constants of the compiled node.
- Rewrite: no change to the node. The linter passes both values. If the linter
  prints this code, report a defect.

```ts
// Compiles when the caller gives the instance id.
const instanceId = this.getInstanceId();
```

## NC015 A function made by a closure factory

**Not supported by decision**: closure factories.

- Cannot compile: a name that a destructuring declaration takes from the
  result of a call: `const { request } = makeTransport(options)`.
- Why: the function exists only at run time. The compiler links names to
  declarations that it can read.
- Rewrite: restructure as top-level functions. Pass the options as arguments,
  or keep them in a top-level `const`.

```ts
// Before
export const { apiRequest } = createTransport({ credentialType: 'acmeApi' });

// After
const CREDENTIAL_TYPE = 'acmeApi';
export async function apiRequest(this: IExecuteFunctions, options: IHttpRequestOptions) {
	return await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIAL_TYPE, options);
}
```

## NC020 A parameter read that is not constant

- Cannot compile: `this.getNodeParameter` with a computed name or with the
  options argument, or code that uses the list of parameters for each item as
  a value.
- Why: the compiler replaces each read with the value of the parameter. It
  needs the name as text.
- Rewrite: write the name as a text literal. Read each parameter with its own
  call. Remove the options argument and convert the value in code.

```ts
// Before
for (const name of ['title', 'body']) data[name] = this.getNodeParameter(name, i);
const id = this.getNodeParameter('channel', i, '', { extractValue: true });

// After
data.title = this.getNodeParameter('title', i);
data.body = this.getNodeParameter('body', i);
const id = this.getNodeParameter('channel', i, '');
```

## NC021 A parameter read with an item index that is not the index of an item

- Cannot compile: a read of a parameter that has an expression, with an index
  that the compiler cannot prove is the index of an input item.
- Why: such a parameter has one value for each item.
- Rewrite: read the parameter in the item loop, with the loop variable as the
  index.

```ts
// Before
const title = this.getNodeParameter('title', items.length - 1);

// After
for (let i = 0; i < items.length; i++) {
	const title = this.getNodeParameter('title', i);
}
```

## NC030 A credential used as a whole value

- Cannot compile: a credential object that the code spreads, copies, returns,
  logs or passes on as one value.
- Why: a compiled node never holds a secret. Each field is a marker that the
  engine fills in when it sends the request.
- Rewrite: read single fields and put them into the request. Better: declare
  `authenticate` on the credential type.

```ts
// Before
const credentials = await this.getCredentials('acmeApi');
const client = createClient(credentials);

// After
const credentials = await this.getCredentials('acmeApi');
const options = { url: `${credentials.baseUrl}/users`, headers: { 'X-Api-Key': credentials.apiKey } };
```

## NC031 Node code that reads a credential value

- Cannot compile: a comparison, a branch, a computation or a method call on a
  credential field.
- Why: node code can place a credential field in a request, but it never sees
  the value.
- Rewrite: move the logic to the credential type, or make the choice a node
  parameter or a credential field of type `options`.

```ts
// Before
const token = credentials.token.trim();
if (credentials.region === 'eu') url = EU_URL;

// After
const headers = { Authorization: `Bearer ${credentials.token}` };
const url = this.getNodeParameter('region', 0) === 'eu' ? EU_URL : US_URL;
```

## NC032 A random value in credential code

**Not supported by decision**: random bytes for secrets and nonces.

- Cannot compile: `randomBytes`, a UUID or another random value in
  `authenticate` or in signing code.
- Why: credential code must give the same result each time it runs.
- Rewrite: use an authentication scheme without a nonce, if the service has
  one. If not, the node needs a native version.

```ts
// Before
requestOptions.headers.Nonce = randomBytes(16).toString('hex');

// After
requestOptions.headers.Authorization = `Bearer ${credentials.apiKey}`;
```

## NC033 A session or token request in a form that the compiler does not know

- Cannot compile: a request with a credential type that gets a session token
  first, when the type is not text or the call has token options; a Google
  service-account token with a service or scopes that are not constants.
- Why: the engine gets these tokens itself, and it needs the type, the service
  and the scopes at compile time.
- Rewrite: name the credential type as a text literal, with no token options.
  Give the Google service as a text literal.

```ts
// Before
await this.helpers.requestWithAuthentication.call(this, credentialType, options, { tokenType: 'x' });

// After
await this.helpers.requestWithAuthentication.call(this, 'acmeApi', options);
```

## NC040 Class inheritance

**Not supported by decision**: class inheritance.

- Cannot compile: a class with `extends`, and `super`, `new.target` or
  `arguments` in a class.
- Why: the compiler turns a class into plain functions. A parent class needs a
  method lookup at run time.
- Rewrite: restructure as one class without a parent, or as top-level
  functions.

```ts
// Before
class UserClient extends BaseClient {
	list() { return this.get('/users'); }
}

// After
class UserClient {
	constructor(private readonly context: IExecuteFunctions) {}
	list() { return apiRequest.call(this.context, 'GET', '/users'); }
}
```

## NC041 A class feature without a compiled form

- Cannot compile: a getter, a setter, a static block, a private `#name` or
  computed field, a generator method, a constructor with `return`, `this` in a
  nested `function`, or a call of a method that the class does not have.
- Why: the compiler supports plain classes: fields, a constructor that stores
  its arguments, and methods.
- Rewrite: use plain fields and methods, and arrow functions in methods.

```ts
// Before
class Page {
	#size = 50;
	get limit() { return this.#size; }
}

// After
class Page {
	size = 50;
	limit() { return this.size; }
}
```

## NC042 An object of a class that is not a constant

- Cannot compile: `new C()` inside an expression, or a name that holds an
  object and has more than one binding.
- Why: the compiler replaces each object with its fields. It must know the
  class of each name at compile time.
- Rewrite: make each object in its own `const` statement.

```ts
// Before
const users = await new Client(this).list();

// After
const client = new Client(this);
const users = await client.list();
```

## NC043 An object, a class or a method used as a value

- Cannot compile: an object of a class that the code returns, stores in a list
  or passes as a value; a class or a method that the code uses without a call.
- Why: after compilation there is no object, only its fields and functions.
- Rewrite: use the object only to call its methods and read its fields.

```ts
// Before
const results = await Promise.all(ids.map(client.fetch));

// After
const results = [];
for (const id of ids) results.push(await client.fetch(id));
```

## NC044 A constructor or a field that the compiler cannot follow

- Cannot compile: a constructor that uses the object before it stores the
  context or its helper objects, a class that writes the context field again
  or reuses the parameter name, code outside the class that reads the context
  field.
- Why: the compiler must see where the class keeps the context: in plain
  statements at the start of the constructor.
- Rewrite: start the constructor with plain stores.

```ts
// Before
constructor(context: IExecuteFunctions) {
	this.setup();
	this.context = context;
}

// After
constructor(context: IExecuteFunctions) {
	this.context = context;
	this.setup();
}
```

## NC045 An object picked from a table by a computed key

- Cannot compile: `table[key]` for a table of objects or handlers, when the
  key is not a constant for the node instance, or an entry does not have the
  method.
- Why: the compiler picks the entry at compile time.
- Rewrite: index the table with a parameter that is constant for the instance.

```ts
// Before
const handler = handlers[items[i].json.type];

// After
const resource = this.getNodeParameter('resource', 0);
const handler = handlers[resource];
```

## NC050 A full response read beyond body, headers and status code

- Cannot compile: `statusMessage` or `request` of a response from a request
  with `returnFullResponse` or `resolveWithFullResponse`.
- Why: the compiled engine keeps the body, the headers and the status code.
- Rewrite: read `body`, `headers` and `statusCode` only.

```ts
// Before
return { status: response.statusCode, text: response.statusMessage };

// After
return { status: response.statusCode };
```

## NC051 `instanceof Error` on a value that may not be an error

- Cannot compile: `error instanceof Error` in a `catch` block, when the `try`
  block can throw text or a plain object.
- Why: in compiled code a caught value is data. The compiler can answer the
  test only when every thrown value is an error.
- Rewrite: throw errors only, or remove the test.

```ts
// Before
throw 'The file is empty';

// After
throw new NodeOperationError(this.getNode(), 'The file is empty');
```

## NC052 Bytes used in a form that the compiler does not know

- Cannot compile: a `Buffer` or file bytes that the code slices, joins,
  parses, or turns into new binary data.
- Why: file bytes stay in the engine. Compiled code holds a reference.
- Rewrite: use `Buffer.from(text, encoding).toString(encoding)` with utf8,
  base64, base64url or hex; an input file as a part of a multipart body;
  `length`; and `prepareBinaryData` with the body of a response.

```ts
// Before
const data = Buffer.concat([header, await this.helpers.getBinaryDataBuffer(i, 'data')]);

// After
const formData = { file: { value: await this.helpers.getBinaryDataBuffer(i, 'data'), options: { filename } } };
```

## NC053 A date call without a compiled form

- Cannot compile: a `moment` call with a computed format, unit or time zone,
  a format token that the engine does not have, or a moment object that the
  code keeps in a variable.
- Why: the engine has its own date functions, and it needs constant
  arguments.
- Rewrite: write one chain that ends in text or a number, with literal
  arguments.

```ts
// Before
const when = moment(value);
const text = when.format(this.getNodeParameter('format', i));

// After
const text = moment(value).format('YYYY-MM-DD');
```

## NC054 Match details of a regular expression

- Cannot compile: `match.index`, `match.groups` or `match.indices`.
- Why: the compiled form of a match is the list of matched texts.
- Rewrite: read groups by number.

```ts
// Before
const id = /(?<id>\d+)$/.exec(url)?.groups?.id;

// After
const id = /(\d+)$/.exec(url)?.[1];
```

## NC100 A language construct without a compiled form

- Cannot compile: a class expression, a getter or setter in an object, an
  object method, a named function expression, a generator, a tagged template,
  a label, `with`, a rest parameter in a function that is used as a value,
  `var` with a destructuring pattern, a method rewrite inside an optional
  chain, or code that does not parse.
- Why: compiled node code is a subset of TypeScript: functions, plain
  objects, arrays, loops and `try`/`catch`.
- Rewrite: use plain functions and data.

```ts
// Before
const api = { get(path: string) { return path; } };

// After
const api = { get: (path: string) => path };
```

## NC101 A `catch` block that reads the error

- Cannot compile: a `catch` block that reads the error, when the `try` block
  can throw an error of the JavaScript runtime.
- Why: the text of a runtime error (for example a `TypeError`) can differ in
  the compiled engine.
- Rewrite: test the value before you use it, so that only requests and n8n
  errors can throw in the `try` block.

```ts
// Before
try { name = response.user.name; } catch (error) { name = error.message; }

// After
name = response.user === undefined ? 'unknown' : response.user.name;
```

## NC102 `instanceof` with a class that the compiler does not know

- Cannot compile: `value instanceof SomeClass`.
- Why: compiled values are data without a prototype.
- Rewrite: test the shape of the value.

```ts
// Before
if (value instanceof Date) text = value.toISOString();

// After
if (typeof value === 'string') text = value;
```

## NC103 Promise callbacks

- Cannot compile: `new Promise`, `.then`, `.catch`, `.finally` and other
  Promise callbacks.
- Why: compiled code runs each request in order with `await`.
- Rewrite: use `await` in a `try`/`catch`, and a loop for many requests.

```ts
// Before
const pages = await Promise.all(ids.map((id) => fetchPage.call(this, id)));

// After
const pages = [];
for (const id of ids) pages.push(await fetchPage.call(this, id));
```

## NC104 Binary data made in code

- Cannot compile: code that makes bytes (`new Uint8Array`, `Buffer.alloc`).
- Why: bytes come from a response or from an input item.
- Rewrite: get the file from a response and pass the body to
  `prepareBinaryData`. See NC052.

```ts
// Before
const bytes = Buffer.alloc(16);

// After
const file = await this.helpers.prepareBinaryData(response.body, fileName);
```

## NC105 A regular expression form without a compiled form

- Cannot compile: `new RegExp(variable)`, a regular expression used as text,
  syntax that the engine does not have, or a replace callback with more than
  9 groups.
- Why: the engine compiles each regular expression ahead of time.
- Rewrite: write the pattern as a literal.

```ts
// Before
const matcher = new RegExp(`^${prefix}`);

// After
const matches = text.startsWith(prefix);
```

## NC106 Locale or date formatting outside the built-in tables

- Cannot compile: a Luxon, `Intl`, `toLocaleString` or `localeCompare` call
  with a computed locale, zone, format or options.
- Why: the engine has tables for a fixed list of locales, time zones and
  format tokens.
- Rewrite: use literal arguments.

```ts
// Before
const text = DateTime.fromISO(value).toFormat(format);

// After
const text = DateTime.fromISO(value).toFormat('yyyy-MM-dd');
```

## NC107 A name of the Code node in node code

- Cannot compile: `$input`, `$node`, `$items`, `$execution`, `$workflow`,
  the result of a `console` call, or the `@n8n-host` comment.
- Why: these names belong to the Code node. Node code reads data through the
  n8n context.
- Rewrite: use the context.

```ts
// Before
const items = $input.all();

// After
const items = this.getInputData();
```

## NC108 A global without a compiled form

- Cannot compile: `require`, `process`, `fetch`, `setTimeout`, `setInterval`,
  `WeakMap`, `URLSearchParams`, the `Buffer` or `crypto` object, and other
  globals of Node.js.
- Why: compiled code has only the n8n context and plain JavaScript values.
- Rewrite: use the context and `n8n-workflow` helpers.

```ts
// Before
await new Promise((resolve) => setTimeout(resolve, 1000));
const response = await fetch(url);

// After
await sleep(1000);
const response = await this.helpers.httpRequest({ url });
```

## NC190 Compiled code that does not pass the workflow-language check

- Cannot compile: code that the node compiler printed and the workflow
  compiler then refused, with a `WL` code.
- Why: the node compiler passed a construct through without a rewrite.
- Rewrite: read the `WL` message, which names the construct, and write it
  with plain functions and data. If the source has no such construct, report
  a compiler defect.

```ts
// Before (for example WL005: `for...in` is not allowed)
for (const key in fields) body[key] = fields[key];

// After
for (const key of Object.keys(fields)) body[key] = fields[key];
```

## NC999 An error that has no rule yet

- Cannot compile: the compiler stopped with a message that this catalogue
  does not know.
- Why: a new error, or a failure inside the compiler.
- Rewrite: read the message, and report it so that the catalogue gets a rule.
