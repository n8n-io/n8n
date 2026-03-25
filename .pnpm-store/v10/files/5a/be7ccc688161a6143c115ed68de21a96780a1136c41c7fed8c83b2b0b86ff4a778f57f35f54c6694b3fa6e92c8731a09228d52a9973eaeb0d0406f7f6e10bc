[![npm version](https://badgen.now.sh/npm/v/isolated-vm)](https://www.npmjs.com/package/isolated-vm)
[![isc license](https://badgen.now.sh/npm/license/isolated-vm)](https://github.com/laverdet/isolated-vm/blob/main/LICENSE)
[![github action](https://github.com/laverdet/isolated-vm/actions/workflows/build.yml/badge.svg)](https://github.com/laverdet/isolated-vm/actions/workflows/build.yml)
[![npm downloads](https://badgen.now.sh/npm/dm/isolated-vm)](https://www.npmjs.com/package/isolated-vm)

isolated-vm -- Access to multiple isolates in nodejs
====================================================

[![NPM](https://nodei.co/npm/isolated-vm.png)](https://www.npmjs.com/package/isolated-vm)

`isolated-vm` is a library for nodejs which gives you access to v8's `Isolate` interface. This
allows you to create JavaScript environments which are completely *isolated* from each other. This
can be a powerful tool to run code in a fresh JavaScript environment completely free of extraneous
capabilities provided by the nodejs runtime.


PROJECT STATUS
--------------

`isolated-vm` is currently in *maintenance mode*. New features are not actively being added but
existing features and new versions of nodejs are supported as possible. There are some major
architectural changes which need to be added to improve the stability and security of the project. I
don't have as much spare time as I did when I started this project, so there is not currently any
plan for these improvements.

#### Wishlist

1) Multi-process architecture. v8 is *not* resilient to out of memory conditions and is unable to
gracefully unwind from these errors. Therefore it is possible, and even common, to crash a process
with poorly-written or hostile software. I implemented a band-aid for this with the
`onCatastrophicError` callback which quarantines a corrupted isolate, but it is not reliable.

2) Bundled v8 version. nodejs uses a patched version of v8 which makes development of this module
more difficult than it needs to be. For some reason they're also allowed to change the v8 ABI in
semver minor releases as well, which causes issues for users while upgrading nodejs. Also, some
Linux distributions strip "internal" symbols from their nodejs binaries which makes usage of this
module impossible. I think the way to go is to compile and link against our own version of v8.

CONTENTS
--------

* [Requirements](#requirements)
* [Who Is Using isolated-vm](#who-is-using-isolated-vm)
* [Security](#security)
* [API Documentation](#api-documentation)
	* [Isolate](#class-isolate-transferable)
	* [Context](#class-context-transferable)
	* [Script](#class-script-transferable)
	* [Module](#class-module-transferable)
	* [Callback](#class-callback-transferable)
	* [Reference](#class-reference-transferable)
	* [ExternalCopy](#class-externalcopy-transferable)
* [Examples](#examples)
* [🚨 Frequently Asked Question 🚨](#frequently-asked-question)
* [Alternatives](#alternatives)


REQUIREMENTS
------------

This project requires nodejs version 16.x (or later).

🚨 If you are using a version of nodejs 20.x or later, you must pass `--no-node-snapshot` to `node`.

Furthermore, to install this module you will need a compiler installed. If you run into errors while
running `npm install isolated-vm` it is likely you don't have a compiler set up, or your compiler is
too old.

* Windows + OS X users should follow the instructions here: [node-gyp](https://github.com/nodejs/node-gyp)
* Ubuntu users should run: `sudo apt-get install python g++ build-essential`
* Alpine users should run: `sudo apk add python3 make g++`
* Amazon Linux AMI users should run: `sudo yum install gcc72 gcc72-c++`
* Arch Linux users should run: `sudo pacman -S make gcc python`
* Red Hat users should run: `sudo dnf install python3 make gcc gcc-c++ zlib-devel brotli-devel openssl-devel`


WHO IS USING ISOLATED-VM
------------------------

* [Screeps](https://screeps.com/) - Screeps is an online JavaScript-based MMO+RPG game. They are
using isolated-vm to run arbitrary player-supplied code in secure environments which can persistent
for several days at a time.

* [Fly](https://fly.io/) - Fly is a programmable CDN which hosts dynamic endpoints as opposed to
just static resources. They are using isolated-vm to run globally distributed applications, where
each application may have wildly different traffic patterns.

* [Algolia](https://www.algolia.com) - Algolia is a Search as a Service provider. They use
`isolated-vm` to power their [Custom Crawler](https://www.algolia.com/products/crawler/) product,
which allows them to safely execute user-provided code for content extraction.

* [Tripadvisor](https://www.tripadvisor.com) - Tripadvisor is the world’s largest travel platform.
They use `isolated-vm` to server-side render thousands of React pages per second.


SECURITY
--------

Running untrusted code is an extraordinarily difficult problem which must be approached with great
care. Use of `isolated-vm` to run untrusted code does not automatically make your application safe.
Through carelessness or misuse of the library it can be possible to leak sensitive data or grant
undesired privileges to an isolate.

At a minimum you should take care not to leak any instances of `isolated-vm` objects (`Reference`,
`ExternalCopy`, etc) to untrusted code. It is usually trivial for an attacker to use these instances
as a springboard back into the nodejs isolate which will yield complete control over a process.

Additionally, it is wise to keep nodejs up to date through point releases which affect v8. You can
find these on the [nodejs changelog](https://github.com/nodejs/node/blob/master/CHANGELOG.md) by
looking for entries such as "update V8 to 9.1.269.36 (Michaël Zasso) #38273". Historically there
have usually been 3-5 of these updates within a single nodejs LTS release cycle. It is *not*
recommended to use odd-numbered nodejs releases since these frequently break ABI and API
compatibility and isolated-vm doesn't aim to be compatible with bleeding edge v8.

v8 is a relatively robust runtime, but there are always new and exciting ways to crash, hang,
exploit, or otherwise disrupt a process with plain old JavaScript. Your application must be
resilient to these kinds of issues and attacks. It's a good idea to keep instances of `isolated-vm`
in a different nodejs process than other critical infrastructure.

If [advanced persistent threats](https://en.wikipedia.org/wiki/Advanced_persistent_threat) are
within your threat model it's a very good idea to architect your application using a foundation
similar to Chromium's [site
isolation](https://www.chromium.org/Home/chromium-security/site-isolation). You'll also need to make
sure to keep your system kernel up to date against [local privilege
escalation](https://en.wikipedia.org/wiki/Privilege_escalation) attacks. Running your service in a
container such as a Docker may be a good idea but it is important to research container escape
attacks as well.


API DOCUMENTATION
-----------------

Since isolates share no resources with each other, most of this API is built to provide primitives
which make marshalling data between many isolates quick and easy. The only way to pass data from one
isolate to another is to first make that data *transferable*. Primitives (except for `Symbol`) are
always transferable. This means if you invoke a function in a different isolate with a number or
string as the argument, it will work fine. If you need to pass more complex information you will
have to first make the data transferable with one of the methods here.

Most methods will provide both a synchronous and an asynchronous version. Calling the synchronous
functions will block your thread while the method runs and eventually returns a value. The
asynchronous functions will return a
[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
while the work runs in a separate thread pool.

There are some rules about which functions may be called from certain contexts:

1. Asynchronous functions may be called at any time
2. Synchronous functions usually may not be called from an asynchronous function
3. You may call a synchronous function from an asynchronous function as long as that function
	belongs to current isolate
4. You may call a synchronous function belonging to the default nodejs isolate at any time

Additionally, some methods will provide an "ignored" version which runs asynchronously but returns
no promise. This can be a good option when the calling isolate would ignore the promise anyway,
since the ignored versions can skip an extra thread synchronization. Just be careful because this
swallows any thrown exceptions which might make problems hard to track down.

It's also worth noting that all asynchronous invocations will run in the order they were queued,
regardless of whether or not you wait on them. So, for instance, you could call several "ignored"
methods in a row and then `await` on a final async method to observe some side-effect of the
ignored methods.


### Class: `Isolate` *[transferable]*
This is the main reference to an isolate. Every handle to an isolate is transferable, which means
you can give isolates references to each other. An isolate will remain valid as long as someone
holds a handle to the isolate or anything created inside that isolate. Once an isolate is lost the
garbage collector should eventually find it and clean up its memory. Since an isolate and all it
contains can represent quite a large chunk of memory though you may want to explicitly call the
`dispose()` method on isolates that you are finished with to get that memory back immediately.

##### `new ivm.Isolate(options)`
* `options` *[object]*
	* `memoryLimit` *[number]* - Memory limit that this isolate may use, in MB. Note that this is more
	of a guideline instead of a strict limit. A determined attacker could use 2-3 times this limit
	before their script is terminated. Against non-hostile code this limit should be pretty close. The
	default is 128MB and the minimum is 8MB.
	* `inspector` *[boolean]* - Enable v8 inspector support in this isolate. See
	`inspector-example.js` in this repository for an example of how to use this.
	* `snapshot` *[ExternalCopy[ArrayBuffer]]* - This is an optional snapshot created from
	`createSnapshot` which will be used to initialize the heap of this isolate.
  * `onCatastrophicError` *[function]* - Callback to be invoked when a *very bad* error occurs. If
    this is invoked it means that v8 has lost all control over the isolate, and all resources in use
    are totally unrecoverable. If you receive this error you should log the error, stop serving
    requests, finish outstanding work, and end the process by calling `process.abort()`.

##### `ivm.Isolate.createSnapshot(scripts, warmup_script)`
* `scripts` *[array]*
	* `code` *[string]* - Source code to set up this snapshot
	* [`{ ...ScriptOrigin }`](#scriptorigin)
* `warmup_script` *[string]* - Optional script to "warmup" the snapshot by triggering code
compilation

🚨 You should not use this feature. It was never all that stable to begin with and has grown
increasingly unstable due to changes in v8.

**Note**: `createSnapshot` does not provide the same isolate protection like the rest of
isolated-vm. If the script passed to `createSnapshot` uses too much memory the process will crash,
and if it has an infinite loop it will stall the process. Furthermore newer v8 features may simply
fail when attempting to take a snapshot that uses them. It is best to snapshot code that only
defines functions, class, and simple data structures.

##### `isolate.compileScript(code)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `isolate.compileScriptSync(code)`
* `code` *[string]* - The JavaScript code to compile.
* `options` *[object]*
	* [`{ ...CachedDataOptions }`](#cacheddataoptions)
	* [`{ ...ScriptOrigin }`](#scriptorigin)

* **return** A [`Script`](#class-script-transferable) object.

Note that a [`Script`](#class-script-transferable) can only run in the isolate which created it.

##### `isolate.compileModule(code)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `isolate.compileModuleSync(code)`
* `code` *[string]* - The JavaScript code to compile.
* `options` *[object]*
  * `meta` *[function]* - Callback which will be invoked the first time this module accesses
    `import.meta`. The `meta` object will be passed as the first argument. This option may only be
    used when invoking `compileModule` from within the same isolate.
	* [`{ ...CachedDataOptions }`](#cacheddataoptions)
	* [`{ ...ScriptOrigin }`](#scriptorigin)

* **return** A [`Module`](#class-module-transferable) object.

Note that a [`Module`](#class-module-transferable) can only run in the isolate which created it.

##### `isolate.createContext()` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `isolate.createContextSync()`
* `options` *[object]*
	* `inspector` *[boolean]* - Enable the v8 inspector for this context. The inspector must have been
		enabled for the isolate as well.

* **return** A [`Context`](#class-context-transferable) object.

##### `isolate.dispose()`
Destroys this isolate and invalidates all references obtained from it.

##### `isolate.getHeapStatistics()` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `isolate.getHeapStatisticsSync()`
* **return** [object]

Returns heap statistics from v8. The return value is almost identical to the nodejs function
[v8.getHeapStatistics()](https://nodejs.org/dist/latest-v8.x/docs/api/v8.html#v8_v8_getheapstatistics).
This function returns one additional property: `externally_allocated_size` which is the total amount
of currently allocated memory which is not included in the v8 heap but counts against this isolate's
`memoryLimit`. ArrayBuffer instances over a certain size are externally allocated and will be
counted here.

##### `isolate.cpuTime` *bigint*
##### `isolate.wallTime` *bigint*
The total CPU and wall time spent in this isolate, in nanoseconds. CPU time is the amount of time
the isolate has spent actively doing work on the CPU. Wall time is the amount of time the isolate
has been running, including passive time spent waiting (think "wall" like a clock on the wall). For
instance, if an isolate makes a call into another isolate, wall time will continue increasing while
CPU time will remain the same.

Note that in nodejs v10.x the return value is a regular number, since bigint isn't supported on
earlier versions.

Also note that CPU time may vary drastically if there is contention for the CPU. This could occur if
other processes are trying to do work, or if you have more than `require('os').cpus().length`
isolates currently doing work in the same nodejs process.

##### `isolate.isDisposed` *[boolean]*
Flag that indicates whether this isolate has been disposed.

##### `isolate.referenceCount` *[number]*
Returns the total count of active `Reference` instances that belong to this isolate. Note that in
certain cases many `Reference` instances in JavaScript will point to the same underlying reference
handle, in which case this number will only reflect the underlying reference handle. This happens
when you transfer a `Reference` instance via some method which accepts transferable values. This
will also include underlying reference handles created by isolated-vm like `Script` or `Context`
objects.

##### `isolate.startCpuProfiler(title)` *[void]*
Start a CPU profiler in the isolate, for performance profiling. It only collects cpu profiles when
the isolate is active in a thread.

##### `isolate.stopCpuProfiler(title)` *[Promise<Array<ThreadCpuProfile>>]*
Stop a CPU profiler previously started using the same title. It returns an array of profiles dependening
on how many times the isolate get activated in a thread.


* **return** An array of [`ThreadCpuProfile`](#thread-cpu-profile) objects.

### Class: `Context` *[transferable]*
A context is a sandboxed execution environment within an isolate. Each context contains its own
built-in objects and global space.

##### `context.global` *[`Reference`](#class-reference-transferable)*
[`Reference`](#class-reference-transferable) to this context's global object. Note that if you call
`context.release()` the global reference will be released as well.

##### `context.eval(code, options)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `context.evalIgnored(code, options)`
##### `context.evalSync(code, options)`
* `code` *[string]* - The code to run
* `options` *[object]*
	* `timeout` *[number]* - Maximum amount of time in milliseconds this script is allowed to run
		before execution is canceled. Default is no timeout.
	* [`{ ...ScriptOrigin }`](#scriptorigin)
	* [`{ ...TransferOptions }`](#transferoptions)
* **return** *[transferable]*

Compiles and executes a script within a context. This will return the last value evaluated, as long
as that value was transferable, otherwise `undefined` will be returned.

##### `context.evalClosure(code, arguments, options)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `context.evalClosureIgnored(code, arguments, options)`
##### `context.evalClosureSync(code, arguments, options)`
* `code` *[string]* - The code to run
* `arguments` *[array]` - Arguments to pass to this code
* `options` *[object]*
	* `timeout` *[number]* - Maximum amount of time in milliseconds this script is allowed to run
		before execution is canceled. Default is no timeout.
	* [`{ ...ScriptOrigin }`](#scriptorigin)
	* `arguments` *[object]*
		* [`{ ...TransferOptions }`](#transferoptions)
	* `result` *[object]*
		* [`{ ...TransferOptions }`](#transferoptions)
* **return** `*[transferable]*

Compiles and runs code as if it were inside a function, similar to the seldom-used `new
Function(code)` constructor. You can pass arguments to the function and they will be available as
`$0`, `$1`, and so on. You can also use `return` from the code.

##### `context.release()`

Releases this reference to the context. You can call this to free up v8 resources immediately, or
you can let the garbage collector handle it when it feels like it. Note that if there are other
references to this context it will not be disposed. This only affects this reference to the context.


### Class: `Script` *[transferable]*
A script is a compiled chunk of JavaScript which can be executed in any context within a single
isolate.

##### `script.release()`

Releases the reference to this script, allowing the script data to be garbage collected. Functions
and data created in the isolate by previous invocations to `script.run(...)` will still be alive in
their respective contexts-- this only means that you can't invoke `script.run(...)` again with this
reference.

##### `script.run(context, options)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `script.runIgnored(context, options)`
##### `script.runSync(context, options)`
* `context` *[`Context`](#class-context-transferable)* - The context in which this script will run.
* `options` *[object]*
	* `release` *[boolean]* - If true `release()` will automatically be called on this instance.
	* `timeout` *[number]* - Maximum amount of time in milliseconds this script is allowed to run
		before execution is canceled. Default is no timeout.
	* [`{ ...TransferOptions }`](#transferoptions)
* **return** *[transferable]*

Runs a given script within a context. This will return the last value evaluated in a given script,
as long as that value was transferable, otherwise `undefined` will be returned. For instance if your
script was "let foo = 1; let bar = 2; bar = foo + bar" then the return value will be 3 because that
is the last expression.


### Class: `Module` *[transferable]*
A JavaScript module. Note that a [`Module`](#class-module-transferable) can only run in the isolate which created it.

##### `module.dependencySpecifiers`
A read-only array of all dependency specifiers the module has.

		const code = `import something from './something';`;
		const module = await isolate.compileModule(code);
		const dependencySpecifiers = module.dependencySpecifiers;
		// dependencySpecifiers => ["./something"];

##### `module.namespace`
Returns a [`Reference`](#class-reference-transferable) containing all exported values.

##### `module.instantiate(context, resolveCallback)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `module.instantiateSync(context, resolveCallback)`
* `context` *[`Context`](#class-context-transferable)* - The context the module should use.
* `resolveCallback` - This callback is responsible for resolving all direct and indirect
dependencies of this module. It accepts two parameters: `specifier` and `referrer`. It must return a
`Module` instance which will be used to satisfy the dependency. The asynchronous version of
`instantiate` may return a promise from `resolveCallback`.

Instantiate the module together with all its dependencies. Calling this more than once on a single
module will have no effect.

##### `module.evaluate(options)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `module.evaluateSync(options)`
* `options` *[object]* - Optional.
	* `timeout` *[number]* - Maximum amount of time in milliseconds this module is allowed to
	run before execution is canceled. Default is no timeout.
* **return** *[transferable]*

Evaluate the module and return the last expression (same as script.run). If `evaluate` is called
more than once on the same module the return value from the first invocation will be returned (or
thrown).

**Note:** nodejs v14.8.0 enabled top-level await by default which has the effect of breaking the
return value of this function.

##### `module.release()`

Releases this module. This behaves the same as other `.release()` methods.

### Class: `Callback` *[transferable]*
Callbacks can be used to create cross-isolate references to simple functions. This can be easier and
safer than dealing with the more flexible [`Reference`](#class-reference-transferable) class.
Arguments passed to and returned from callbacks are always copied using the same method as
[`ExternalCopy`](#class-externalcopy-transferable). When transferred to another isolate, instances
of `Callback` will turn into a plain old function. Callbacks are created automatically when passing
functions to most isolated-vm functions.

##### `new ivm.Callback(fn, options)`
* `options` *[object]*
	* `async` *[boolean]* - Function will invoke the callback in "async" mode, which immediately
		returns a promise.
	* `ignored` *[boolean]* - Function will invoke the callback in "ignored" mode, which immediately
		returns `undefined` and ignores the result of the function (including thrown exceptions)
	* `sync` *[boolean]* - Function will invoke the callback in "sync" mode, blocking for a response
		(default).


### Class: `Reference` *[transferable]*
A instance of [`Reference`](#class-reference-transferable) is a pointer to a value stored in any isolate.

##### `new ivm.Reference(value, options)`
* `value` - The value to create a reference to.
* `options` *[object]*
  * `unsafeInherit` *[boolean]* - If enabled then the `get` family of functions will follow the
    object's prototype chain. References created with this option should never be given to untrusted
    code.

##### `reference.typeof` *[string]*

This is the typeof the referenced value, and is available at any time from any isolate. Note that
this differs from the real `typeof` operator in that `null` is "null", and Symbols are "object".

##### `reference.copy()` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `reference.copySync()`
* **return** JavaScript value of the reference.

Creates a copy of the referenced value and internalizes it into this isolate. This uses the same
copy rules as [`ExternalCopy`](#class-externalcopy-transferable).

##### `reference.deref()`
* `options` *[object]*
	* `release` *[boolean]* - If true `release()` will automatically be called on this instance.
* **return** The value referenced by this handle.

Will attempt to return the actual value or object pointed to by this reference. Note that in order
to call this function the reference must be owned by the current isolate, otherwise an error will be
thrown.

##### `reference.derefInto()`
* `options` *[object]*
	* `release` *[boolean]* - If true `release()` will automatically be called on this instance.
* **return** *[transferable]*

Returns an object, which when passed to another isolate will cause that isolate to dereference the
handle.

##### `reference.release()`

Releases this reference. If you're passing around a lot of references between isolates it's wise to
release the references when you are done. Otherwise you may run into issues with isolates running
out of memory because other isolates haven't garbage collected recently. After calling this method
all attempts to access the reference will throw an error.

##### `reference.delete(property)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `reference.deleteIgnored(property)`
##### `reference.deleteSync(property)`
* `property` *[transferable]* - The property to access on this object.

Delete a property from this reference, as if using `delete reference[property]`

##### `reference.get(property, options)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `reference.getSync(property, options)`
* `property` *[transferable]* - The property to access on this object.
* `options` *[object]*
	* `accessors` *[boolean]* - Whether or not to invoke accessors and proxies on the underlying
		object. Note that there is no way to supply a timeout to this function so only use this option in
		trusted code.
	* [`{ ...TransferOptions }`](#transferoptions)
* **return** A [`Reference`](#class-reference-transferable) object.

Will access a reference as if using `reference[property]` and transfer the value out.

If the object is a proxy, or if the property is a getter, this method will throw unless the
`accessors` option is true.

##### `reference.set(property, value, options)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `reference.setIgnored(property, value, options)`
##### `reference.setSync(property, value, options)`
* `property` *[transferable]* - The property to set on this object.
* `value` *[transferable]* - The value to set on this object.
* `options` *[object]*
	* [`{ ...TransferOptions }`](#transferoptions)

##### `reference.apply(receiver, arguments, options)` *[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*
##### `reference.applyIgnored(receiver, arguments, options)`
##### `reference.applySync(receiver, arguments, options)`
##### `reference.applySyncPromise(receiver, arguments, options)`
* `receiver` *[transferable]* - The value which will be `this`.
* `arguments` *[array]* - Array of transferables which will be passed to the function.
* `options` *[object]*
	* `timeout` *[number]* - Maximum amount of time in milliseconds this function is allowed to run
		before execution is canceled. Default is no timeout.
	* `arguments` *[object]*
		* [`{ ...TransferOptions }`](#transferoptions)
	* `result` *[object]*
		* [`{ ...TransferOptions }`](#transferoptions)
* **return** *[transferable]*

Will attempt to invoke an object as if it were a function. If the return value is transferable it
will be returned to the caller of `apply`, otherwise it will return an instance of `Reference`. This
behavior can be changed with the `result` options.

`applySyncPromise` is a special version of `applySync` which may only be invoked on functions
belonging to the default isolate AND may only be invoked from a non-default thread. Functions
invoked in this way may return a promise and the invoking isolate will wait for that promise to
resolve before resuming execution. You can use this to implement functions like `readFileSync` in a
way that doesn't block the default isolate. Note that the invoking isolate will not respond to any
async functions until this promise is resolved, however synchronous functions will still function
correctly. Misuse of this feature may result in deadlocked isolates, though the default isolate
will never be at risk of a deadlock.


### Class: `ExternalCopy` *[transferable]*
Instances of this class represent some value that is stored outside of any v8 isolate. This value
can then be quickly copied into any isolate without any extra thread synchronization.

##### `new ivm.ExternalCopy(value, options)`
* `value` - The value to copy.
* `options` *[object]*
	* `transferList` *[boolean]* - An array of `ArrayBuffer` instances to transfer ownership. This
		behaves in a similar way to
		[`postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage).
	* `transferOut` *[boolean]* - If true this will release ownership of the given resource from this
		isolate. This operation completes in constant time since it doesn't have to copy an arbitrarily
		large object. This only applies to ArrayBuffer and TypedArray instances.

Primitive values can be copied exactly as they are. Date objects will be copied as Dates.
ArrayBuffers, TypedArrays, and DataViews will be copied in an efficient format. SharedArrayBuffers
will simply copy a reference to the existing memory and when copied into another isolate the new
SharedArrayBuffer will point to the same underlying data. After passing a SharedArrayBuffer to
ExternalCopy for the first time isolated-vm will take over management of the underlying memory
block, so a "copied" SharedArrayBuffer can outlive the isolate that created the memory originally.

All other objects will be copied in seralized form using the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).
`ExternalCopy` can copy objects with deeply nested *transferable* objects. For example:

```js
let isolate = new ivm.Isolate;
let context = isolate.createContextSync();
let global = context.global;
let data = new ExternalCopy({ isolate, context, global });
```

##### `ExternalCopy.totalExternalSize` *[number]*

This is a static property which will return the total number of bytes that isolated-vm has allocated
outside of v8 due to instances of `ExternalCopy`.

##### `externalCopy.copy(options)`
* `options` *[object]*
	* `release` *[boolean]* - If true `release()` will automatically be called on this instance.
	* `transferIn` *[boolean]* - If true this will transfer the resource directly into this isolate,
	invalidating the ExternalCopy handle.
* **return** - JavaScript value of the external copy.

Internalizes the ExternalCopy data into this isolate.

##### `externalCopy.copyInto(options)`
* `options` *[object]*
	* `release` *[boolean]* - If true `release()` will automatically be called on this instance.
	* `transferIn` *[boolean]* - If true this will transfer the resource directly into this isolate,
	invalidating the ExternalCopy handle.
* **return** *[transferable]*

Returns an object, which when passed to another isolate will cause that isolate to internalize a
copy of this value.

#### `externalCopy.release()`

Releases the reference to this copy. If there are other references to this copy elsewhere the copy
will still remain in memory, but this handle will no longer be active. Disposing ExternalCopy
instances isn't super important, v8 is a lot better at cleaning these up automatically because
there's no inter-isolate dependencies.

### Shared Options
Many methods in this library accept common options between them. They are documented here instead of
being colocated with each instance.

##### `CachedDataOptions`
* `cachedData` *[ExternalCopy[ArrayBuffer]]* - This will consume cached compilation data from a
	previous call to this function. `cachedDataRejected` will be set to `true` if the supplied data
	was rejected by V8.
* `produceCachedData` *[boolean]* - Produce V8 cache data. Similar to the
	[VM.Script](https://nodejs.org/api/vm.html) option of the same name. If this is true then the
	returned object will have `cachedData` set to an ExternalCopy handle. Note that this differs from
	the VM.Script option slightly in that `cachedDataProduced` is never set.

Most functions which compile or run code can produce and consume cached data. You can produce cached
data and use the data in later invocations to drastically speed up parsing of the same script. You
can even save this data to disk and use it in a different process. You can set both `cachedData` and
`produceCachedData`, in which case new cached data will only be produced if the data supplied was
invalid.

*NOTE*: CachedData contains compiled machine code. That means you should not accept `cachedData`
payloads from a user, otherwise they may be able to run arbitrary code.

##### `ScriptOrigin`
* `filename` *[string]* - Filename of this source code
* `columnOffset` *[number]* - Column offset of this source code
* `lineOffset` *[number]* - Line offset of this source code

You may optionally specify information on compiled code's filename. This is used in various
debugging contexts within v8, including stack traces and the inspector. It is recommended to use a
valid URI scheme, for example: `{ filename: 'file:///test.js' }`, otherwise some devtools may
malfunction.

##### `TransferOptions`
* `copy` *[boolean]* - Automatically deep copy value
* `externalCopy` *[boolean]* - Automatically wrap value in `ExternalCopy` instance
* `reference` *[boolean]* - Automatically wrap value in `Reference` instance
* `promise` *[boolean]* - Automatically proxy any returned promises between isolates. This can be
	used in combination with the other transfer options.

Any function which moves data between isolates will accept these transfer options. By default only
*[transferable]* values may pass between isolates. Without specifying one of these options the
function may ignore the value, throw, or wrap it in a reference depending on the context.

More advanced situations like transferring ownership of `ArrayBuffer` instances will require direct
use of [`ExternalCopy`](#class-externalcopy-transferable) or
[`Reference`](#class-reference-transferable).



##### `ThreadCpuProfile`
It's a object that contains a thread id and a [CpuProfile](#cpuprofile) info.

* `threadId` *[number]* - The thread that isolate runs on.
* `profile` *[CpuProfile]* - The [CpuProfile](#cpuprofile).

##### `CpuProfile`
The CpuProfile Object that can be `JSON.stringify(cpuProfile)`, and save to any external file system
for later reloaded into chrome dev tool or any other js performance tool to review.

The format should matches the definition in: https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-Profile

* `startTime` *[number]* - The start timestamp when calling `.startProfiling`.
* `endTime` *[number]* - The end timestamp when calling `.stopProfiling`,
* `samples` *[Array<number>]* - All sample node id has been collected.
* `timeDeltas` *[Array<number>]* - All the time deltas related to the `samples`.
* `nodes` *[Array<Node>]*
	* `hitCount` *[number]*
	* `id` *[id]*
	* `children` *[Array<number>]*
	* `callFrame` *[CallFrame]*
		* `functionName` *[string]*
		* `url` *[string]* - The `filename` used in [`ScriptOrigin`](#scriptorigin)
		* `scriptId` *[number]*
		* `lineNumber` *[number]*
		* `columnNumber` *[number]*
		* `bailoutReason` *[string?]* - When the JavaScript function bailed out from v8 optimization,
			this field will present.


EXAMPLES
--------

Below is a sample program which shows basic usage of the library.

```js
// Create a new isolate limited to 128MB
const ivm = require('isolated-vm');
const isolate = new ivm.Isolate({ memoryLimit: 128 });

// Create a new context within this isolate. Each context has its own copy of all the builtin
// Objects. So for instance if one context does Object.prototype.foo = 1 this would not affect any
// other contexts.
const context = isolate.createContextSync();

// Get a Reference{} to the global object within the context.
const jail = context.global;

// This makes the global object available in the context as `global`. We use `derefInto()` here
// because otherwise `global` would actually be a Reference{} object in the new isolate.
jail.setSync('global', jail.derefInto());

// We will create a basic `log` function for the new isolate to use.
jail.setSync('log', function(...args) {
	console.log(...args);
});

// And let's test it out:
context.evalSync('log("hello world")');
// > hello world

// Let's see what happens when we try to blow the isolate's memory
const hostile = isolate.compileScriptSync(`
	const storage = [];
	const twoMegabytes = 1024 * 1024 * 2;
	while (true) {
		const array = new Uint8Array(twoMegabytes);
		for (let ii = 0; ii < twoMegabytes; ii += 4096) {
			array[ii] = 1; // we have to put something in the array to flush to real memory
		}
		storage.push(array);
		log('I\\'ve wasted '+ (storage.length * 2)+ 'MB');
	}
`);

// Using the async version of `run` so that calls to `log` will get to the main node isolate
hostile.run(context).catch(err => console.error(err));
// I've wasted 2MB
// I've wasted 4MB
// ...
// I've wasted 130MB
// I've wasted 132MB
// RangeError: Array buffer allocation failed
```


FREQUENTLY ASKED QUESTION
-------------------------

There is only 1 frequently asked question:

"How do I pass a [module, function, object, library] into an isolate?"

You don't! Isolates are `isolated`. An *isolate* is its own environment with its own heap which is
*isolated* from all other **isolates**. It may help to think of the question in the context of a
web browser. How would you pass a function from nodejs into Firefox? You can't, it is nonsense.

Depending on the function you could just pass the code for the function directly into the isolate
and execute it there. That's how a `<script />` tag works in our browser metaphor. This works for
functions that don't need to do anything such as file access or network requests. Check out Webpack,
Rollup, esbuild, etc for bundling solutions.

If you want to perform operations on files, network, native modules, etc then you will need to set
up some kind of shim delegate which can perform the operation within nodejs and pass the result back
to your isolate. In the browser metaphor this would be like a REST call back to your service.

Finally, and I'm not trying to be mean here, if this explanation doesn't make sense then you really
should not be using this module. This is a low-level module which is just one piece of a very
complicated problem. If your goal is to run code from untrusted sources then you *must* have a very
comprehensive understanding of JavaScript. You should know where the ECMAScript specification ends
and where the HTML, DOM, and other web specifications begin. You should be a security-focused
hacker, otherwise you will almost certain make a company-ending mistake. This is not a module for
the faint of heart. Turn back now!


ALTERNATIVES
------------

Below is a quick summary of some other options available on nodejs and how they differ from
isolated-vm. The table headers are defined as follows:

* **Secure**: Obstructs access to unsafe nodejs capabilities
* **Memory Limits**: Possible to set memory limits / safe against heap overflow DoS attacks
* **Isolated**: Is garbage collection, heap, etc isolated from application
* **Multithreaded**: Run code on many threads from a single process
* **Module Support**: Is `require` supported out of the box
* **Inspector Support**: Chrome DevTools supported

| Module                                                                       | Secure | Memory Limits | Isolated | Multithreaded | Module Support | Inspector Support |
| ---------------------------------------------------------------------------- | :----: | :-----------: | :------: | :-----------: | :------------: | :---------------: |
| [vm](https://nodejs.org/api/vm.html)                                         |        |               |          |               |       ✅       |        ✅         |
| [worker_threads](https://nodejs.org/api/worker_threads.html)                 |        |               |    ✅    |      ✅       |       ✅       |        ✅         |
| [vm2](https://github.com/patriksimek/vm2)                                    |       |               |          |               |       ✅       |        ✅         |
| [tiny-worker](https://github.com/avoidwork/tiny-worker)                      |        |               |    ✅    |               |       ✅       |                   |
| isolated-vm                                                                  |   ✅   |       ✅      |    ✅    |      ✅       |                |        ✅         |
