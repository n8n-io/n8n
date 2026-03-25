'use strict';

/**
 * This callback will be called to transform a script to JavaScript.
 *
 * @callback compileCallback
 * @param {string} code - Script code to transform to JavaScript.
 * @param {string} filename - Filename of this script.
 * @return {string} JavaScript code that represents the script code.
 */

/**
 * This callback will be called to resolve a module if it couldn't be found.
 *
 * @callback resolveCallback
 * @param {string} moduleName - Name of the modulusedRequiree to resolve.
 * @param {string} dirname - Name of the current directory.
 * @return {(string|undefined)} The file or directory to use to load the requested module.
 */

const fs = require('fs');
const pa = require('path');
const {
	Script,
	createContext
} = require('vm');
const {
	EventEmitter
} = require('events');
const {
	INSPECT_MAX_BYTES
} = require('buffer');
const {
	createBridge,
	VMError
} = require('./bridge');
const {
	transformer,
	INTERNAL_STATE_NAME
} = require('./transformer');
const {
	lookupCompiler
} = require('./compiler');
const {
	VMScript
} = require('./script');
const {
	inspect
} = require('util');

const objectDefineProperties = Object.defineProperties;

/**
 * Host objects
 *
 * @private
 */
const HOST = Object.freeze({
	Buffer,
	Function,
	Object,
	transformAndCheck,
	INSPECT_MAX_BYTES,
	INTERNAL_STATE_NAME
});

/**
 * Compile a script.
 *
 * @private
 * @param {string} filename - Filename of the script.
 * @param {string} script - Script.
 * @return {vm.Script} The compiled script.
 */
function compileScript(filename, script) {
	return new Script(script, {
		__proto__: null,
		filename,
		displayErrors: false
	});
}

/**
 * Default run options for vm.Script.runInContext
 *
 * @private
 */
const DEFAULT_RUN_OPTIONS = Object.freeze({__proto__: null, displayErrors: false});

function checkAsync(allow) {
	if (!allow) throw new VMError('Async not available');
}

function transformAndCheck(args, code, isAsync, isGenerator, allowAsync) {
	const ret = transformer(args, code, isAsync, isGenerator, undefined);
	checkAsync(allowAsync || !ret.hasAsync);
	return ret.code;
}

/**
 *
 * This callback will be called and has a specific time to finish.<br>
 * No parameters will be supplied.<br>
 * If parameters are required, use a closure.
 *
 * @private
 * @callback runWithTimeout
 * @return {*}
 *
 */

let cacheTimeoutContext = null;
let cacheTimeoutScript = null;

/**
 * Run a function with a specific timeout.
 *
 * @private
 * @param {runWithTimeout} fn - Function to run with the specific timeout.
 * @param {number} timeout - The amount of time to give the function to finish.
 * @return {*} The value returned by the function.
 * @throws {Error} If the function took to long.
 */
function doWithTimeout(fn, timeout) {
	if (!cacheTimeoutContext) {
		cacheTimeoutContext = createContext();
		cacheTimeoutScript = new Script('fn()', {
			__proto__: null,
			filename: 'timeout_bridge.js',
			displayErrors: false
		});
	}
	cacheTimeoutContext.fn = fn;
	try {
		return cacheTimeoutScript.runInContext(cacheTimeoutContext, {
			__proto__: null,
			displayErrors: false,
			timeout
		});
	} finally {
		cacheTimeoutContext.fn = null;
	}
}

const bridgeScript = compileScript(`${__dirname}/bridge.js`,
	`(function(global) {"use strict"; const exports = {};${fs.readFileSync(`${__dirname}/bridge.js`, 'utf8')}\nreturn exports;})`);
const setupSandboxScript = compileScript(`${__dirname}/setup-sandbox.js`,
	`(function(global, host, bridge, data, context) { ${fs.readFileSync(`${__dirname}/setup-sandbox.js`, 'utf8')}\n})`);
const getGlobalScript = compileScript('get_global.js', 'this');

let getGeneratorFunctionScript = null;
let getAsyncFunctionScript = null;
let getAsyncGeneratorFunctionScript = null;
try {
	getGeneratorFunctionScript = compileScript('get_generator_function.js', '(function*(){}).constructor');
} catch (ex) {}
try {
	getAsyncFunctionScript = compileScript('get_async_function.js', '(async function(){}).constructor');
} catch (ex) {}
try {
	getAsyncGeneratorFunctionScript = compileScript('get_async_generator_function.js', '(async function*(){}).constructor');
} catch (ex) {}

/**
 * Class VM.
 *
 * @public
 */
class VM extends EventEmitter {

	/**
	 * The timeout for {@link VM#run} calls.
	 *
	 * @public
	 * @since v3.9.0
	 * @member {number} timeout
	 * @memberOf VM#
	 */

	/**
	 * Get the global sandbox object.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {Object} sandbox
	 * @memberOf VM#
	 */

	/**
	 * The compiler to use to get the JavaScript code.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {(string|compileCallback)} compiler
	 * @memberOf VM#
	 */

	/**
	 * The resolved compiler to use to get the JavaScript code.
	 *
	 * @private
	 * @readonly
	 * @member {compileCallback} _compiler
	 * @memberOf VM#
	 */

	/**
	 * Create a new VM instance.
	 *
	 * @public
	 * @param {Object} [options] - VM options.
	 * @param {number} [options.timeout] - The amount of time until a call to {@link VM#run} will timeout.
	 * @param {Object} [options.sandbox] - Objects that will be copied into the global object of the sandbox.
	 * @param {(string|compileCallback)} [options.compiler="javascript"] - The compiler to use.
	 * @param {boolean} [options.eval=true] - Allow the dynamic evaluation of code via eval(code) or Function(code)().<br>
	 * Only available for node v10+.
	 * @param {boolean} [options.wasm=true] - Allow to run wasm code.<br>
	 * Only available for node v10+.
	 * @param {boolean} [options.allowAsync=true] - Allows for async functions.
	 * @throws {VMError} If the compiler is unknown.
	 */
	constructor(options = {}) {
		super();

		// Read all options
		const {
			timeout,
			sandbox,
			compiler = 'javascript',
			compilerOptions,
			allowAsync: optAllowAsync = true
		} = options;
		const allowEval = options.eval !== false;
		const allowWasm = options.wasm !== false;
		const allowAsync = optAllowAsync && !options.fixAsync;

		// Early error if sandbox is not an object.
		if (sandbox && 'object' !== typeof sandbox) {
			throw new VMError('Sandbox must be object.');
		}

		// Early error if compiler can't be found.
		const resolvedCompiler = lookupCompiler(compiler, compilerOptions);

		// Create a new context for this vm.
		const _context = createContext(undefined, {
			__proto__: null,
			codeGeneration: {
				__proto__: null,
				strings: allowEval,
				wasm: allowWasm
			}
		});

		const sandboxGlobal = getGlobalScript.runInContext(_context, DEFAULT_RUN_OPTIONS);

		// Initialize the sandbox bridge
		const {
			createBridge: sandboxCreateBridge
		} = bridgeScript.runInContext(_context, DEFAULT_RUN_OPTIONS)(sandboxGlobal);

		// Initialize the bridge
		const bridge = createBridge(sandboxCreateBridge, () => {});

		const data = {
			__proto__: null,
			allowAsync
		};

		if (getGeneratorFunctionScript) {
			data.GeneratorFunction = getGeneratorFunctionScript.runInContext(_context, DEFAULT_RUN_OPTIONS);
		}
		if (getAsyncFunctionScript) {
			data.AsyncFunction = getAsyncFunctionScript.runInContext(_context, DEFAULT_RUN_OPTIONS);
		}
		if (getAsyncGeneratorFunctionScript) {
			data.AsyncGeneratorFunction = getAsyncGeneratorFunctionScript.runInContext(_context, DEFAULT_RUN_OPTIONS);
		}

		// Create the bridge between the host and the sandbox.
		const internal = setupSandboxScript.runInContext(_context, DEFAULT_RUN_OPTIONS)(sandboxGlobal, HOST, bridge.other, data, _context);

		const runScript = (script) => {
			// This closure is intentional to hide _context and bridge since the allow to access the sandbox directly which is unsafe.
			let ret;
			try {
				ret = script.runInContext(_context, DEFAULT_RUN_OPTIONS);
			} catch (e) {
				throw bridge.from(e);
			}
			return bridge.from(ret);
		};

		const makeReadonly = (value, mock) => {
			try {
				internal.readonly(value, mock);
			} catch (e) {
				throw bridge.from(e);
			}
			return value;
		};

		const makeProtected = (value) => {
			const sandboxBridge = bridge.other;
			try {
				sandboxBridge.fromWithFactory(sandboxBridge.protectedFactory, value);
			} catch (e) {
				throw bridge.from(e);
			}
			return value;
		};

		const addProtoMapping = (hostProto, sandboxProto) => {
			const sandboxBridge = bridge.other;
			let otherProto;
			try {
				otherProto = sandboxBridge.from(sandboxProto);
				sandboxBridge.addProtoMapping(otherProto, hostProto);
			} catch (e) {
				throw bridge.from(e);
			}
			bridge.addProtoMapping(hostProto, otherProto);
		};

		const addProtoMappingFactory = (hostProto, sandboxProtoFactory) => {
			const sandboxBridge = bridge.other;
			const factory = () => {
				const proto = sandboxProtoFactory(this);
				bridge.addProtoMapping(hostProto, proto);
				return proto;
			};
			try {
				const otherProtoFactory = sandboxBridge.from(factory);
				sandboxBridge.addProtoMappingFactory(otherProtoFactory, hostProto);
			} catch (e) {
				throw bridge.from(e);
			}
		};

		// Define the properties of this object.
		// Use Object.defineProperties here to be able to
		// hide and set properties read-only.
		objectDefineProperties(this, {
			__proto__: null,
			timeout: {
				__proto__: null,
				value: timeout,
				writable: true,
				enumerable: true
			},
			compiler: {
				__proto__: null,
				value: compiler,
				enumerable: true
			},
			sandbox: {
				__proto__: null,
				value: bridge.from(sandboxGlobal),
				enumerable: true
			},
			_runScript: {__proto__: null, value: runScript},
			_makeReadonly: {__proto__: null, value: makeReadonly},
			_makeProtected: {__proto__: null, value: makeProtected},
			_addProtoMapping: {__proto__: null, value: addProtoMapping},
			_addProtoMappingFactory: {__proto__: null, value: addProtoMappingFactory},
			_compiler: {__proto__: null, value: resolvedCompiler},
			_allowAsync: {__proto__: null, value: allowAsync}
		});

		this.readonly(inspect);

		// prepare global sandbox
		if (sandbox) {
			this.setGlobals(sandbox);
		}
	}

	/**
	 * Adds all the values to the globals.
	 *
	 * @public
	 * @since v3.9.0
	 * @param {Object} values - All values that will be added to the globals.
	 * @return {this} This for chaining.
	 * @throws {*} If the setter of a global throws an exception it is propagated. And the remaining globals will not be written.
	 */
	setGlobals(values) {
		for (const name in values) {
			if (Object.prototype.hasOwnProperty.call(values, name)) {
				this.sandbox[name] = values[name];
			}
		}
		return this;
	}

	/**
	 * Set a global value.
	 *
	 * @public
	 * @since v3.9.0
	 * @param {string} name - The name of the global.
	 * @param {*} value - The value of the global.
	 * @return {this} This for chaining.
	 * @throws {*} If the setter of the global throws an exception it is propagated.
	 */
	setGlobal(name, value) {
		this.sandbox[name] = value;
		return this;
	}

	/**
	 * Get a global value.
	 *
	 * @public
	 * @since v3.9.0
	 * @param {string} name - The name of the global.
	 * @return {*} The value of the global.
	 * @throws {*} If the getter of the global throws an exception it is propagated.
	 */
	getGlobal(name) {
		return this.sandbox[name];
	}

	/**
	 * Freezes the object inside VM making it read-only. Not available for primitive values.
	 *
	 * @public
	 * @param {*} value - Object to freeze.
	 * @param {string} [globalName] - Whether to add the object to global.
	 * @return {*} Object to freeze.
	 * @throws {*} If the setter of the global throws an exception it is propagated.
	 */
	freeze(value, globalName) {
		this.readonly(value);
		if (globalName) this.sandbox[globalName] = value;
		return value;
	}

	/**
	 * Freezes the object inside VM making it read-only. Not available for primitive values.
	 *
	 * @public
	 * @param {*} value - Object to freeze.
	 * @param {*} [mock] - When the object does not have a property the mock is used before prototype lookup.
	 * @return {*} Object to freeze.
	 */
	readonly(value, mock) {
		return this._makeReadonly(value, mock);
	}

	/**
	 * Protects the object inside VM making impossible to set functions as it's properties. Not available for primitive values.
	 *
	 * @public
	 * @param {*} value - Object to protect.
	 * @param {string} [globalName] - Whether to add the object to global.
	 * @return {*} Object to protect.
	 * @throws {*} If the setter of the global throws an exception it is propagated.
	 */
	protect(value, globalName) {
		this._makeProtected(value);
		if (globalName) this.sandbox[globalName] = value;
		return value;
	}

	/**
	 * Run the code in VM.
	 *
	 * @public
	 * @param {(string|VMScript)} code - Code to run.
	 * @param {(string|Object)} [options] - Options map or filename.
	 * @param {string} [options.filename="vm.js"] - Filename that shows up in any stack traces produced from this script.<br>
	 * This is only used if code is a String.
	 * @return {*} Result of executed code.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 * @throws {Error} An error is thrown when the script took to long and there is a timeout.
	 * @throws {*} If the script execution terminated with an exception it is propagated.
	 */
	run(code, options) {
		let script;
		let filename;

		if (typeof options === 'object') {
			filename = options.filename;
		} else {
			filename = options;
		}

		if (code instanceof VMScript) {
			script = code._compileVM();
			checkAsync(this._allowAsync || !code._hasAsync);
		} else {
			const useFileName = filename || 'vm.js';
			let scriptCode = this._compiler(code, useFileName);
			const ret = transformer(null, scriptCode, false, false, useFileName);
			scriptCode = ret.code;
			checkAsync(this._allowAsync || !ret.hasAsync);
			// Compile the script here so that we don't need to create a instance of VMScript.
			script = new Script(scriptCode, {
				__proto__: null,
				filename: useFileName,
				displayErrors: false
			});
		}

		if (!this.timeout) {
			return this._runScript(script);
		}

		return doWithTimeout(() => {
			return this._runScript(script);
		}, this.timeout);
	}

	/**
	 * Run the code in VM.
	 *
	 * @public
	 * @since v3.9.0
	 * @param {string} filename - Filename of file to load and execute in a NodeVM.
	 * @return {*} Result of executed code.
	 * @throws {Error} If filename is not a valid filename.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 * @throws {Error} An error is thrown when the script took to long and there is a timeout.
	 * @throws {*} If the script execution terminated with an exception it is propagated.
	 */
	runFile(filename) {
		const resolvedFilename = pa.resolve(filename);

		if (!fs.existsSync(resolvedFilename)) {
			throw new VMError(`Script '${filename}' not found.`);
		}

		if (fs.statSync(resolvedFilename).isDirectory()) {
			throw new VMError('Script must be file, got directory.');
		}

		return this.run(fs.readFileSync(resolvedFilename, 'utf8'), resolvedFilename);
	}

}

exports.VM = VM;
