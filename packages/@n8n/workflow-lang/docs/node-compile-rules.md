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
  `this.getWorkflowStaticData`, `this.logger`.
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
- Also: a read of a value that v1 checks or casts, when the compiler has no
  equal check. See "Parameter validation of v1 at `getNodeParameter`".

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

## NC022 An expression that the node evaluates from a text that is not known

- Cannot compile: `this.evaluateExpression(text, i)` with a text that the
  compiler does not know: a value of an item, a parameter that has an
  expression, or a variable that the code changes before the loop.
- Compiles: a text literal, and each `{{ }}` part of a parameter without an
  expression that the node finds with `getResolvables` of n8n. The converter
  translates each expression. The module reads its value for the item. A
  failed expression throws the error of v1 at the call.
- Why: the converter translates expressions before the run. The engine has no
  evaluator for a text that exists only at run time.
- Rewrite: loop over `getResolvables` of the parameter directly after the
  read.

```ts
// Before
let query = this.getNodeParameter('query', i) as string;
query = query.trim();
for (const part of getResolvables(query)) {
	query = query.replace(part, this.evaluateExpression(part, i) as string);
}

// After
let query = this.getNodeParameter('query', i) as string;
for (const part of getResolvables(query)) {
	query = query.replace(part, this.evaluateExpression(part, i) as string);
}
query = query.trim();
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

## Parameter validation of v1 at `getNodeParameter`

This section is not an error code. It states what the v1 engine does to a
parameter value when node code reads it, and what the node compiler does for
each case. A read that the compiler cannot check gets the error NC020
(`v1 checks the type of the parameter '<name>' when the node reads it, and
<cause>`). The node then runs in the fallback host.

### The order of the steps in v1

Source: `packages/core/src/execution-engine/node-execution-context/node-execution-context.ts`,
`_getNodeParameter` (line 526).

1. v1 reads the raw value with `get(node.parameters, name, fallback)`. When the
   value is `undefined`, it throws `UserError('Could not get parameter "<name>"')`
   (line 541).
2. `rawExpressions: true` returns the raw value. No expression runs and no
   check runs (line 547).
3. v1 resolves the expressions for the item (line 557).
4. `extractValue: true` extracts the value of a resource locator (line 595).
5. `ensureType` converts the value (line 600, `utils/ensure-type.ts` line 4).
   `null` gives `Parameter '<name>' must not be null`. `undefined` gives
   `Parameter '<name>' could not be 'undefined'`. `object`, `array` and `json`
   parse a text with `JSON.parse` (`Parameter '<name>' could not be parsed`)
   and reject other values (`Parameter '<name>' must be an <type>, but we got
   '<value>'`). `string` uses `JSON.stringify` for an object and `String` for
   other values. `number` uses `Number` and rejects `NaN` (`Parameter '<name>'
   must be a number, but we got '<value>'`). `boolean` uses `Boolean`.
6. `skipValidation: true` returns the value here (line 608).
7. `validateValueAgainstSchema` checks the value (line 612,
   `utils/validate-value-against-schema.ts` line 187).

### Which reads v1 validates

`validateValueAgainstSchema` takes the first property of the node description
with the name of the first path segment that `displayParameter` shows for the
node parameters (line 197). When no property is shown, there is no check. Then
at most one of these cases applies, in this order:

- (b) The path has one segment, and the property has `validateType` and not
  `ignoreValidationDuringExecution` (line 209). v1 calls
  `validateFieldType(name, value, validateType)` without options.
- (a) The property type is `resourceMapper`, the second path segment is
  `value`, and the value is an object (line 219). `validateResourceMapperValue`
  (line 46) does nothing unless the path has exactly two segments and the
  parameter has `mappingMode`, `schema` and `value`. For each key of the value,
  in the order of the keys, it takes the first schema entry with that `id`:
  - When the mapper has `mode: 'add'`, the entry is `required`, the entry type
    is not `boolean`, and the value is `null` or `undefined`: the read fails
    with the description `The value "<key>" is required but not set`.
  - When the entry has a type: `validateFieldType(key, value, type, {
    valueOptions: entry.options, strict, parseStrings })`. `strict` is
    `showTypeConversionOptions && !attemptToConvertTypes`. `parseStrings` is
    `showTypeConversionOptions && (alwaysConvertFieldsToString ||
    convertFieldsToString)`. `showTypeConversionOptions` and
    `alwaysConvertFieldsToString` come from `typeOptions.resourceMapper` of the
    description. `attemptToConvertTypes` and `convertFieldsToString` come from
    the parameter. v1 writes the cast value back into the value.
- (c) The property type is `collection` or `fixedCollection` (line 233), for
  each path length. `validateCollection` (line 113) takes the members of the
  collection, or the members of the group with the name of the second path
  segment of a fixed collection. Only members with `validateType` and without
  `ignoreValidationDuringExecution` count. For the value, or for each entry
  when the value is a list, and for each key with such a member, v1 calls
  `validateFieldType(key, value[key], validateType, { valueOptions })`.
  `valueOptions` are the options of the member when `validateType` is
  `options`. v1 writes the cast value back. A value of `null` fails with the
  JavaScript error `Cannot convert undefined or null to object`.

`ignoreTypeMismatchErrors` is not a part of `getNodeParameter`. It is an
option that node code reads and applies in its own code.

### The casts of `validateFieldType`

Source: `packages/workflow/src/type-validation.ts`, `validateFieldType`
(line 347). The type name is compared in lower case. `null` and `undefined`
are valid for each type, and the new value is `undefined` (line 353). The
usual message is `'<field>' expects a <type> but we got <given>`. `<given>` is
`'null'`, `array`, `object`, or the value in single quotes (line 286).

| Type | Cast (not strict) | Strict | Rejected |
|---|---|---|---|
| `string` | No change. With `parseStrings`: `JSON.stringify` for an object, `toString` for other values (line 24) | With `parseStrings`: only a text | Usual message |
| `number` | `Number(value)` (line 15) | Only a number | `NaN`: usual message |
| `boolean` | A boolean; `true` and `false` in each letter case; a value that `Number` gives 0 or 1 for, but not a blank text (line 48) | Only a boolean | Usual message |
| `dateTime` | A luxon `DateTime`: ISO, HTTP, RFC 2822, SQL, then `Date.parse` (line 72) | Same | Usual message, then a hint about `DateTime.fromFormat` (line 406) |
| `time` | `String(value)` when it fits `hh:mm`, an optional `:ss`, an optional offset of four digits and an optional offset `h`, `hh` or `hh:mm` (line 114) | Same | `'<field>' expects time (hh:mm:(:ss)) but we got <given>.` |
| `array` | A list; or `JSON.parse` of the text, then of the text with `'` replaced by `"` (line 124) | Only a list | Usual message |
| `object` | An object that is not a list; or `jsonParse` with `acceptJSObject` (line 146) | Only an object or a list | Usual message |
| `options` | No change when one option has this value | Same | `'<field>' expects one of the following values: [<values>] but we got <given>` |
| `url` | `https://` in front of a text without `://`; the URL must parse with the protocol `http`, `https`, `ftp` or `file` (line 298) | Same | Usual message |
| `jwt` | `String(value)` when it has three parts with a point between them (line 319) | Same | `Value is not a valid JWT token` |
| `form-fields` | A list of form fields from JSON or from JavaScript object text (line 233) | Same | The message of the parser |
| `binary` | A binary data object (line 162) | Same | Usual message, then a hint about `mimeType`, `data` and `id` (line 426) |
| `string-alphanumeric` | A text of letters, digits and `_` (line 38) | Same | `Value is not a valid alphanumeric string, only letters, numbers and underscore allowed` |
| other | No change | Same | Never |

### The error

For (a) and (b), `validateValueAgainstSchema` throws an `ExpressionError`
(line 245). The message is `Invalid input for '<field>' [item <index>]`.
`<field>` is the key of the mapper value for (a), and the `displayName` of the
property for (b). For (c), `validateCollection` throws an `ExpressionError`
(line 168). The message is `Invalid input for field '<displayName of the
member>' inside '<displayName of the property>' in [item <index>]`. In each
case the `description` is the message of `validateFieldType`, and the context
has `runIndex`, `itemIndex` and `nodeCause` (the name of the node). `<index>`
is the item index of the read.

### What the node compiler does

Source: `src/node-compile/validate.ts` (the plan and the helpers) and
`parameterValidationOf` in `src/node-compile/convert.ts` (the data from the
description).

- The compiler takes the same property as v1. It uses the node parameters and
  `displayParameter`. The description must be the full description of the
  node: a description without `displayName` and `validateType` gives no check.
- A value without an expression that already has the type of its field gets no
  check: a text for `string`, a number for `number`, a boolean for `boolean`,
  a list for `array`, an object for `object`, a listed value for `options`.
- Other values get a helper at the read: `__validParameter` for (b),
  `__validMapped` for (a), `__validMembers` for (c). The helper gets only the
  fields that need a check. It does the casts of the table for `string`,
  `number`, `boolean`, `time`, `array`, `options`, `jwt` and unknown types. It
  throws an error with the name `ExpressionError`, and with the message and
  the `description` of v1. The error has no `context`.
- The compiler does not use a checked value as a constant of the node code.
- These reads stay refused (NC020):
  - A field of the type `dateTime`, `object`, `url`, `binary`, `form-fields`
    or `string-alphanumeric`. The exceptions are a value of `null`, and an
    object for `object`. A `dateTime` cast gives a luxon `DateTime` object.
    The date helpers of the compiler (`moment.ts`) parse and format dates, but
    they do not give a value that node code can use as a `DateTime`. Thus each
    form of a `dateTime` field with a value stays refused. `object` and
    `form-fields` need a parser of JavaScript object text.
  - A read with `extractValue` of a parameter that needs the check of (b).
  - A read with `ensureType` or `rawExpressions`, and options that are not
    constant for the node.
  - A resource mapper that is an expression as a whole, a schema that is not a
    list, or a mapper option with an expression.
  - A collection with a checked member that has a number as its name.
- `skipValidation: true` compiles without a check, as in v1. The flag can be a
  constant of the node code that depends on a parameter without an expression.
- When the caller gives no description data (`validation` is not set), the
  compiler keeps the first rule for a resource mapper: it refuses the read
  when a field of the value has a schema type.

## Forms of general node code

### A labelled loop exit

Source: `src/node-compile/labels.ts`.

- The compiler removes a label that no `break` or `continue` names.
- A `break` or `continue` that names the loop it is in becomes a plain jump.
- A jump from an inner loop sets a flag (`__jump<n>`: 1 for `break`, 2 for
  `continue`) and leaves the inner loop. The code after each inner loop reads
  the flag and continues the exit. A `continue` sets the flag back to 0.
- Stays refused: a label on a statement that is not a loop, and a labelled
  jump that passes through a `switch`.

### A credential value that the code does not read

Source: `src/node-compile/credential-forms.ts`. The secret rule does not
change: node code cannot compare or branch on a credential value.

- `a || field`, `a && field` and `a ?? field` pass the credential value
  through. The compiler applies the rule to the result of the operation.
- `Object.values(o).every(Boolean)` becomes one credential flag when `o` is a
  constant object in the statement before, or an object in place, and each
  value is a credential field or a literal.
- The code can test the truth of a variable when each value of the variable
  is an object, a list, `null`, `undefined`, a boolean or a credential flag.
  The compiler follows conditional expressions, and calls of functions of the
  node through their `return` statements. A value that can be credential text
  stays refused.

### Package functions

Source: `src/node-compile/package-helpers.ts`.

- `lodash/set` with a path that is not a constant of dotted names uses
  `__setPath`. It has the path rules of lodash (`isKey`, `stringToPath`,
  `baseSet`). At run time it stops with `has no compiled form` for a path that
  is not text or a list of text, and for a write to a list that is not at an
  index of the list or the next index (lodash makes a list with holes or with
  named members there).
- `utils.decode_col` and `utils.encode_col` of `@e965/xlsx` use
  `__sheetColumnIndex` and `__sheetColumnName`.

### A parameter that is not there, in a `try` with an empty `catch`

A `try` block that starts with a read of a parameter that the node does not
have, and that has an empty `catch` and no `finally`, does nothing. The
compiler removes it.

### The item index of a loop with a limit

The index of `for (let i = 0; i < limit; i++)` is the index of an input item
when `limit` is at most the count of the items: the count, `0`,
`items.length ? 1 : 0`, or a variable that only holds such values (each write
is a plain assignment).
