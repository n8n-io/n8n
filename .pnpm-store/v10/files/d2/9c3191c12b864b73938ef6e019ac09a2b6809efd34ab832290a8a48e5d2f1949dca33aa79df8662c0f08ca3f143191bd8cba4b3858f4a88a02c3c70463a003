# vm2 [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url] [![License][license-image]][license-url] [![Node.js CI](https://github.com/patriksimek/vm2/actions/workflows/test.yml/badge.svg)](https://github.com/patriksimek/vm2/actions/workflows/test.yml) [![Known Vulnerabilities][snyk-image]][snyk-url]

vm2 is a sandbox that can run untrusted code with whitelisted Node's built-in modules.

## Important Security Disclaimer

**Before using vm2, you should understand how it works and its limitations.**

vm2 attempts to sandbox untrusted JavaScript code **within the same Node.js process** as your application. It does this through a complex network of [Proxies](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Proxy) that intercept and mediate every interaction between the sandbox and the host environment.

### The Fundamental Challenge

JavaScript is an extraordinarily dynamic language. Objects can be accessed through prototype chains, constructors can be reached via error objects, symbols provide protocol hooks, and async execution creates timing windows. The sheer number of ways to traverse from one object to another in JavaScript makes building an airtight in-process sandbox extremely difficult.

**We are honest about this reality:** Despite our best efforts, researchers and security professionals continuously discover new ways to escape the vm2 sandbox. We actively patch these vulnerabilities as they are reported, but the cat-and-mouse nature of in-process sandboxing means that:

1. **New bypasses will likely be discovered in the future.** Check our [security advisories](https://github.com/patriksimek/vm2/security/advisories) for known vulnerabilities.
2. **You must keep vm2 updated** to benefit from the latest security fixes. Subscribe to security advisories and update promptly.
3. **vm2 should not be your only line of defense.** Defense in depth is essential when running untrusted code.

### More Robust Alternatives

If you require stronger isolation guarantees, consider these alternatives that provide **true process or hardware-level isolation**:

| Solution | Approach | Performance | Trade-offs |
|----------|----------|-------------|------------|
| **[isolated-vm](https://github.com/laverdet/isolated-vm)** | Separate V8 isolates (different V8 heap) | Fast | In maintenance mode; requires manual V8 updates |
| **Separate process / Worker** | `child_process` or Worker threads with limited permissions | Medium | Higher IPC overhead; data must be serialized |
| **Containers / VMs** | Docker, gVisor, Firecracker | Slow | Startup overhead; resource-heavy |
| **Managed services** | Cloud-based code execution (e.g., AWS Lambda, Cloudflare Workers) | Variable | Network latency; external dependency |

### When vm2 May Still Be Appropriate

vm2 can be suitable when:
- You need tight integration with host objects and fast synchronous communication
- The untrusted code comes from a relatively trusted source (e.g., internal tools, plugin systems with vetted authors)
- You combine vm2 with other security layers (network isolation, filesystem restrictions, resource limits)
- You accept the risk and actively monitor for security updates

**If you're running code from completely untrusted sources (e.g., arbitrary user submissions), we strongly recommend using a solution with stronger isolation guarantees.**

## Features

-   Runs untrusted code securely in a single process with your code side by side
-   Full control over the sandbox's console output
-   The sandbox has limited access to the process's methods
-   It is possible to require modules (built-in and external) from the sandbox
-   You can limit access to certain (or all) built-in modules
-   You can securely call methods and exchange data and callbacks between sandboxes
-   Actively maintained with patches for known escape methods (see [Security Disclaimer](#important-security-disclaimer))
-   Transpiler support

## How does it work

-   It uses the internal VM module to create a secure context.
-   It uses [Proxies](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to prevent escaping from the sandbox.
-   It overrides the built-in require to control access to modules.

For an in-depth look at vm2’s internals, see the [CONTRIBUTING.md](./CONTRIBUTING.md) file.

## What is the difference between Node's vm and vm2?

Try it yourself:

```js
import { runInNewContext } from "node:vm";

runInNewContext('this.constructor.constructor("return process")().exit()');
console.log('Never gets executed.');
```

```js
import { VM } from 'vm2';

new VM().run('this.constructor.constructor("return process")().exit()');
// Throws ReferenceError: process is not defined
```

## Installation

```sh
npm install vm2
```

## Quick Examples

```js
import { VM } from 'vm2';

const vm = new VM();
vm.run(`process.exit()`); // TypeError: process.exit is not a function
```

```js
import { NodeVM } from 'vm2';

const vm = new NodeVM({
	require: {
		external: true,
		root: './',
	},
});

vm.run(
	`
    var request = require('request');
    request('http://www.google.com', function (error, response, body) {
        console.error(error);
        if (!error && response.statusCode == 200) {
            console.log(body); // Show the HTML for the Google homepage.
        }
    });
`,
	'vm.js',
);
```

## Documentation

-   [VM](#vm)
-   [NodeVM](#nodevm)
-   [VMScript](#vmscript)
-   [Error handling](#error-handling)
-   [Debugging a sandboxed code](#debugging-a-sandboxed-code)
-   [Read-only objects](#read-only-objects-experimental)
-   [Protected objects](#protected-objects-experimental)
-   [Cross-sandbox relationships](#cross-sandbox-relationships)
-   [CLI](#cli)
-   [2.x to 3.x changes](https://github.com/patriksimek/vm2/wiki/2.x-to-3.x-changes)
-   [1.x and 2.x docs](https://github.com/patriksimek/vm2/wiki/1.x-and-2.x-docs)
-   [Contributing](https://github.com/patriksimek/vm2/wiki/Contributing)

## VM

VM is a simple sandbox to synchronously run untrusted code without the `require` feature. Only JavaScript built-in objects and Node's `Buffer` are available. Scheduling functions (`setInterval`, `setTimeout` and `setImmediate`) are not available by default.

**Options:**

-   `timeout` - Script timeout in milliseconds. **WARNING**: You might want to use this option together with `allowAsync=false`. Further, operating on returned objects from the sandbox can run arbitrary code and circumvent the timeout. One should test if the returned object is a primitive with `typeof` and fully discard it (doing logging or creating error messages with such an object might also run arbitrary code again) in the other case.
-   `sandbox` - VM's global object.
-   `compiler` - `javascript` (default), `typescript`, `coffeescript` or custom compiler function. The library expects you to have compiler pre-installed if the value is set to `typescript` or `coffeescript`.
-   `eval` - If set to `false` any calls to `eval` or function constructors (`Function`, `GeneratorFunction`, etc.) will throw an `EvalError` (default: `true`).
-   `wasm` - If set to `false` any attempt to compile a WebAssembly module will throw a `WebAssembly.CompileError` (default: `true`). Note: `WebAssembly.JSTag` is removed inside the sandbox for security reasons, so wasm code cannot catch JavaScript exceptions.
-   `allowAsync` - If set to `false` any attempt to run code using `async` will throw a `VMError` (default: `true`).

**IMPORTANT**: Timeout is only effective on synchronous code that you run through `run`. Timeout does **NOT** work on any method returned by VM. There are some situations when timeout doesn't work - see [#244](https://github.com/patriksimek/vm2/pull/244).

```js
import { VM } from 'vm2';

const vm = new VM({
	timeout: 1000,
	allowAsync: false,
	sandbox: {},
});

vm.run('process.exit()'); // throws ReferenceError: process is not defined
```

You can also retrieve values from VM.

```js
let number = vm.run('1337'); // returns 1337
```

**TIP**: See tests for more usage examples.

## NodeVM

Unlike `VM`, `NodeVM` allows you to require modules in the same way that you would in the regular Node's context.

**Options:**

-   `console` - `inherit` to enable console, `redirect` to redirect to events, `off` to disable console (default: `inherit`).
-   `sandbox` - VM's global object.
-   `compiler` - `javascript` (default), `typescript`, `coffeescript` or custom compiler function (which receives the code, and it's file path). The library expects you to have compiler pre-installed if the value is set to `typescript` or `coffeescript`.
-   `eval` - If set to `false` any calls to `eval` or function constructors (`Function`, `GeneratorFunction`, etc.) will throw an `EvalError` (default: `true`).
-   `wasm` - If set to `false` any attempt to compile a WebAssembly module will throw a `WebAssembly.CompileError` (default: `true`). Note: `WebAssembly.JSTag` is removed inside the sandbox for security reasons, so wasm code cannot catch JavaScript exceptions.
-   `sourceExtensions` - Array of file extensions to treat as source code (default: `['js']`).
-   `require` - `true`, an object or a Resolver to enable `require` method (default: `false`).
-   `require.external` - Values can be `true`, an array of allowed external modules, or an object (default: `false`). All paths matching `/node_modules/${any_allowed_external_module}/(?!/node_modules/)` are allowed to be required.
-   `require.external.modules` - Array of allowed external modules. Also supports wildcards, so specifying `['@scope/*-ver-??]`, for instance, will allow using all modules having a name of the form `@scope/something-ver-aa`, `@scope/other-ver-11`, etc. The `*` wildcard does not match path separators.
-   `require.external.transitive` - Boolean which indicates if transitive dependencies of external modules are allowed (default: `false`). **WARNING**: When a module is required transitively, any module is then able to require it normally, even if this was not possible before it was loaded.
-   `require.builtin` - Array of allowed built-in modules, accepts ["\*"] for all (default: none). **WARNING**: "\*" can be dangerous as new built-ins can be added.
-   `require.root` - Restricted path(s) where local modules can be required (default: every path).
-   `require.mock` - Collection of mock modules (both external or built-in).
-   `require.context` - `host` (default) to require modules in the host and proxy them into the sandbox. `sandbox` to load, compile, and require modules in the sandbox. `callback(moduleFilename, ext)` to dynamically choose a context per module. The default will be sandbox is nothing is specified. Except for `events`, built-in modules are always required in the host and proxied into the sandbox.
-   `require.import` - An array of modules to be loaded into NodeVM on start.
-   `require.resolve` - An additional lookup function in case a module wasn't found in one of the traditional node lookup paths.
-   `require.customRequire` - Use instead of the `require` function to load modules from the host.
-   `require.strict` - `false` to not force strict mode on modules loaded by require (default: `true`).
-   `require.fs` - Custom file system implementation.
-   `nesting` - **WARNING**: Allowing this is a security risk as scripts can create a NodeVM which can require any host module. `true` to enable VMs nesting (default: `false`).
-   `wrapper` - `commonjs` (default) to wrap script into CommonJS wrapper, `none` to retrieve value returned by the script.
-   `argv` - Array to be passed to `process.argv`.
-   `env` - Object to be passed to `process.env`.
-   `strict` - `true` to loaded modules in strict mode (default: `false`).

**IMPORTANT**: Timeout is not effective for NodeVM so it is not immune to `while (true) {}` or similar evil.

**REMEMBER**: The more modules you allow, the more fragile your sandbox becomes.

```js
import { NodeVM } from 'vm2';

const vm = new NodeVM({
	console: 'inherit',
	sandbox: {},
	require: {
		external: true,
		builtin: ['fs', 'path'],
		root: './',
		mock: {
			fs: {
				readFileSync: () => 'Nice try!',
			},
		},
	},
});

// Sync

let functionInSandbox = vm.run('module.exports = function(who) { console.log("hello "+ who); }');
functionInSandbox('world');

// Async

let functionWithCallbackInSandbox = vm.run('module.exports = function(who, callback) { callback("hello "+ who); }');
functionWithCallbackInSandbox('world', greeting => {
	console.log(greeting);
});
```

When `wrapper` is set to `none`, `NodeVM` behaves more like `VM` for synchronous code.

```js
assert.ok(vm.run('return true') === true);
```

**TIP**: See tests for more usage examples.

### Loading modules by relative path

To load modules by relative path, you must pass the full path of the script you're running as a second argument to vm's `run` method if the script is a string. The filename is then displayed in any stack traces generated by the script.

```js
vm.run('require("foobar")', '/data/myvmscript.js');
```

If the script you are running is a VMScript, the path is given in the VMScript constructor.

```js
const script = new VMScript('require("foobar")', { filename: '/data/myvmscript.js' });
vm.run(script);
```

### Resolver

A resolver can be created via `makeResolverFromLegacyOptions` and be used for multiple `NodeVM` instances allowing to share compiled module code potentially speeding up load times. The first example of `NodeVM` can be rewritten using `makeResolverFromLegacyOptions` as follows.

```js
const resolver = makeResolverFromLegacyOptions({
	external: true,
	builtin: ['fs', 'path'],
	root: './',
	mock: {
		fs: {
			readFileSync: () => 'Nice try!',
		},
	},
});
const vm = new NodeVM({
	console: 'inherit',
	sandbox: {},
	require: resolver,
});
```

## VMScript

You can increase performance by using precompiled scripts. The precompiled VMScript can be run multiple times. It is important to note that the code is not bound to any VM (context); rather, it is bound before each run, just for that run.

```js
import { VM, VMScript } from 'vm2';

const vm = new VM();
const script = new VMScript('Math.random()');
console.log(vm.run(script));
console.log(vm.run(script));
```

It works for both `VM` and `NodeVM`.

```js
import { NodeVM, VMScript } from 'vm2';

const vm = new NodeVM();
const script = new VMScript('module.exports = Math.random()');
console.log(vm.run(script));
console.log(vm.run(script));
```

Code is compiled automatically the first time it runs. One can compile the code anytime with `script.compile()`. Once the code is compiled, the method has no effect.

## Error handling

Errors in code compilation and synchronous code execution can be handled by `try-catch`. Errors in asynchronous code execution can be handled by attaching `uncaughtException` event handler to Node's `process`.

```js
try {
	var script = new VMScript('Math.random()').compile();
} catch (err) {
	console.error('Failed to compile script.', err);
}

try {
	vm.run(script);
} catch (err) {
	console.error('Failed to execute script.', err);
}

process.on('uncaughtException', err => {
	console.error('Asynchronous error caught.', err);
});
```

## Debugging a sandboxed code

You can debug or inspect code running in the sandbox as if it was running in a normal process.

-   You can use breakpoints (which requires you to specify a script file name)
-   You can use `debugger` keyword.
-   You can use step-in to step inside the code running in the sandbox.

### Example

/tmp/main.js:

```js
import { VM, VMScript } from 'vm2';
import { readFileSync } from 'node:fs';

const file = `${__dirname}/sandbox.js`;

// By providing a file name as second argument you enable breakpoints
const script = new VMScript(readFileSync(file), file);

new VM().run(script);
```

/tmp/sandbox.js

```js
const foo = 'ahoj';

// The debugger keyword works just fine everywhere.
// Even without specifying a file name to the VMScript object.
debugger;
```

## Read-only objects (experimental)

To prevent sandboxed scripts from adding, changing, or deleting properties from the proxied objects, you can use `freeze` methods to make the object read-only. This is only effective inside VM. Frozen objects are affected deeply. Primitive types cannot be frozen.

**Example without using `freeze`:**

```js
const util = {
	add: (a, b) => a + b,
};

const vm = new VM({
	sandbox: { util },
});

vm.run('util.add = (a, b) => a - b');
console.log(util.add(1, 1)); // returns 0
```

**Example with using `freeze`:**

```js
const vm = new VM(); // Objects specified in the sandbox cannot be frozen.
vm.freeze(util, 'util'); // Second argument adds object to global.

vm.run('util.add = (a, b) => a - b'); // Fails silently when not in strict mode.
console.log(util.add(1, 1)); // returns 2
```

**IMPORTANT:** It is not possible to freeze objects that have already been proxied to the VM.

## Protected objects (experimental)

Unlike `freeze`, this method allows sandboxed scripts to add, change, or delete properties on objects, with one exception - it is not possible to attach functions. Sandboxed scripts are therefore not able to modify methods like `toJSON`, `toString` or `inspect`.

**IMPORTANT:** It is not possible to protect objects that have already been proxied to the VM.

## Cross-sandbox relationships

```js
const assert = require('assert');
const { VM } = require('vm2');

const sandbox = {
	object: new Object(),
	func: new Function(),
	buffer: new Buffer([0x01, 0x05]),
};

const vm = new VM({ sandbox });

assert.ok(vm.run(`object`) === sandbox.object);
assert.ok(vm.run(`object instanceof Object`));
assert.ok(vm.run(`object`) instanceof Object);
assert.ok(vm.run(`object.__proto__ === Object.prototype`));
assert.ok(vm.run(`object`).__proto__ === Object.prototype);

assert.ok(vm.run(`func`) === sandbox.func);
assert.ok(vm.run(`func instanceof Function`));
assert.ok(vm.run(`func`) instanceof Function);
assert.ok(vm.run(`func.__proto__ === Function.prototype`));
assert.ok(vm.run(`func`).__proto__ === Function.prototype);

assert.ok(vm.run(`new func() instanceof func`));
assert.ok(vm.run(`new func()`) instanceof sandbox.func);
assert.ok(vm.run(`new func().__proto__ === func.prototype`));
assert.ok(vm.run(`new func()`).__proto__ === sandbox.func.prototype);

assert.ok(vm.run(`buffer`) === sandbox.buffer);
assert.ok(vm.run(`buffer instanceof Buffer`));
assert.ok(vm.run(`buffer`) instanceof Buffer);
assert.ok(vm.run(`buffer.__proto__ === Buffer.prototype`));
assert.ok(vm.run(`buffer`).__proto__ === Buffer.prototype);
assert.ok(vm.run(`buffer.slice(0, 1) instanceof Buffer`));
assert.ok(vm.run(`buffer.slice(0, 1)`) instanceof Buffer);
```

## CLI

Before you can use vm2 in the command line, install it globally with `npm install vm2 -g`.

```sh
vm2 ./script.js
```

## Known Issues

-   It is not possible to define a class that extends a proxied class. This includes using a proxied class in `Object.create`.
-   Direct eval does not work.
-   Logging sandbox arrays will repeat the array part in the properties.
-   Source code transformations can result a different source string for a function.
-   There are ways to crash the node process from inside the sandbox.

[npm-image]: https://img.shields.io/npm/v/vm2.svg
[npm-url]: https://www.npmjs.com/package/vm2
[license-image]: https://img.shields.io/npm/l/vm2.svg
[license-url]: https://github.com/patriksimek/vm2/blob/resurrection/LICENSE.md
[downloads-image]: https://img.shields.io/npm/dm/vm2.svg
[downloads-url]: https://www.npmjs.com/package/vm2
[snyk-image]: https://snyk.io/test/github/patriksimek/vm2/badge.svg
[snyk-url]: https://snyk.io/test/github/patriksimek/vm2
