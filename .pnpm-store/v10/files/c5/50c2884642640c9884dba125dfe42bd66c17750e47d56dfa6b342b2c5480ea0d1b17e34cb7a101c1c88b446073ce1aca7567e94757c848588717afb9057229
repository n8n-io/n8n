'use strict';
const ivm = require('isolated-vm');

// You *must* require the extension in nodejs first.
require('.');

// `NativeModule` constructor takes a full path to a native module. `require.resolve` handles that
// for us, and finds the module path from `package.json`.
const example = new ivm.NativeModule(require.resolve('.'));

// Create an isolate like normal
let isolate = new ivm.Isolate;
let context = isolate.createContextSync();
let global = context.global;

// Now you can load this module into the isolate. `create` or `createSync` call `InitForContext` in
// C++ which returns a reference to this module for a specific context. The return value is an
// instance of `ivm.Reference` which is just the same object that you would get by doing
// `require('native-example')` in plain nodejs. The compiled native module is also compatible with
// plain nodejs as well.
global.setSync('module', example.createSync(context).derefInto());

// Create unsafe log function
global.setSync('log', new ivm.Reference(function(...args) {
	console.log(...args);
}));

// Now we can test the function
let script = isolate.compileScriptSync(`module.timeout(function() {
	log.apply(0, [ "Timeout triggered" ]);
}, 1000);`);
console.log("Before runSync");
script.runSync(context);
console.log("After runSync");
// logs: 123
