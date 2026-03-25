/* global host, data, VMError */

'use strict';

const LocalError = Error;
const LocalTypeError = TypeError;
const LocalWeakMap = WeakMap;

const {
	apply: localReflectApply,
	defineProperty: localReflectDefineProperty
} = Reflect;

const {
	set: localWeakMapSet,
	get: localWeakMapGet
} = LocalWeakMap.prototype;

const {
	isArray: localArrayIsArray
} = Array;

function uncurryThis(func) {
	return (thiz, ...args) => localReflectApply(func, thiz, args);
}

const localArrayPrototypeSlice = uncurryThis(Array.prototype.slice);
const localArrayPrototypeIncludes = uncurryThis(Array.prototype.includes);
const localArrayPrototypePush = uncurryThis(Array.prototype.push);
const localArrayPrototypeIndexOf = uncurryThis(Array.prototype.indexOf);
const localArrayPrototypeSplice = uncurryThis(Array.prototype.splice);
const localStringPrototypeStartsWith = uncurryThis(String.prototype.startsWith);
const localStringPrototypeSlice = uncurryThis(String.prototype.slice);
const localStringPrototypeIndexOf = uncurryThis(String.prototype.indexOf);

const {
	argv: optionArgv,
	env: optionEnv,
	console: optionConsole,
	extensions,
	emitArgs,
	globalPaths,
	getLookupPathsFor,
	resolve: resolve0,
	lookupPaths,
	loadBuiltinModule,
	registerModule,
	builtinModules,
	dirname,
	basename
} = data;

function ensureSandboxArray(a) {
	return localArrayPrototypeSlice(a);
}

class Module {

	constructor(id, path, parent) {
		this.id = id;
		this.filename = id;
		this.path = path;
		this.parent = parent;
		this.loaded = false;
		this.paths = path ? ensureSandboxArray(getLookupPathsFor(path)) : [];
		this.children = [];
		this.exports = {};
	}

	_updateChildren(child, isNew) {
		const children = this.children;
		if (children && (isNew || !localArrayPrototypeIncludes(children, child))) {
			localArrayPrototypePush(children, child);
		}
	}

	require(id) {
		return requireImpl(this, id, false);
	}

}

const originalRequire = Module.prototype.require;
const cacheBuiltins = {__proto__: null};

function requireImpl(mod, id, direct) {
	if (direct && mod.require !== originalRequire) {
		return mod.require(id);
	}
	const filename = resolve0(mod, id, undefined, Module._extensions, direct);
	if (localStringPrototypeStartsWith(filename, 'node:')) {
		id = localStringPrototypeSlice(filename, 5);
		let nmod = cacheBuiltins[id];
		if (!nmod) {
			nmod = loadBuiltinModule(id);
			if (!nmod) throw new VMError(`Cannot find module '${filename}'`, 'ENOTFOUND');
			cacheBuiltins[id] = nmod;
		}
		return nmod;
	}

	const cachedModule = Module._cache[filename];
	if (cachedModule !== undefined) {
		mod._updateChildren(cachedModule, false);
		return cachedModule.exports;
	}

	let nmod = cacheBuiltins[id];
	if (nmod) return nmod;
	nmod = loadBuiltinModule(id);
	if (nmod) {
		cacheBuiltins[id] = nmod;
		return nmod;
	}

	const path = dirname(filename);
	const module = new Module(filename, path, mod);
	registerModule(module, filename, path, mod, direct);
	mod._updateChildren(module, true);
	try {
		Module._cache[filename] = module;
		const handler = findBestExtensionHandler(filename);
		handler(module, filename);
		module.loaded = true;
	} catch (e) {
		delete Module._cache[filename];
		const children = mod.children;
		if (localArrayIsArray(children)) {
			const index = localArrayPrototypeIndexOf(children, module);
			if (index !== -1) {
				localArrayPrototypeSplice(children, index, 1);
			}
		}
		throw e;
	}

	return module.exports;
}

Module.builtinModules = ensureSandboxArray(builtinModules);
Module.globalPaths = ensureSandboxArray(globalPaths);
Module._extensions = {__proto__: null};
Module._cache = {__proto__: null};

{
	const keys = Object.getOwnPropertyNames(extensions);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const handler = extensions[key];
		Module._extensions[key] = (mod, filename) => handler(mod, filename);
	}
}

function findBestExtensionHandler(filename) {
	const name = basename(filename);
	for (let i = 0; (i = localStringPrototypeIndexOf(name, '.', i + 1)) !== -1;) {
		const ext = localStringPrototypeSlice(name, i);
		const handler = Module._extensions[ext];
		if (handler) return handler;
	}
	const js = Module._extensions['.js'];
	if (js) return js;
	const keys = Object.getOwnPropertyNames(Module._extensions);
	if (keys.length === 0) throw new VMError(`Failed to load '${filename}': Unknown type.`, 'ELOADFAIL');
	return Module._extensions[keys[0]];
}

function createRequireForModule(mod) {
	// eslint-disable-next-line no-shadow
	function require(id) {
		return requireImpl(mod, id, true);
	}
	function resolve(id, options) {
		return resolve0(mod, id, options, Module._extensions, true);
	}
	require.resolve = resolve;
	function paths(id) {
		return ensureSandboxArray(lookupPaths(mod, id));
	}
	resolve.paths = paths;

	require.extensions = Module._extensions;

	require.cache = Module._cache;

	return require;
}

/**
 * Prepare sandbox.
 */

const TIMERS = new LocalWeakMap();

class Timeout {
}

class Interval {
}

class Immediate {
}

function clearTimer(timer) {
	const obj = localReflectApply(localWeakMapGet, TIMERS, [timer]);
	if (obj) {
		obj.clear(obj.value);
	}
}

// This is a function and not an arrow function, since the original is also a function
// eslint-disable-next-line no-shadow
global.setTimeout = function setTimeout(callback, delay, ...args) {
	if (typeof callback !== 'function') throw new LocalTypeError('"callback" argument must be a function');
	const obj = new Timeout(callback, args);
	const cb = () => {
		localReflectApply(callback, null, args);
	};
	const tmr = host.setTimeout(cb, delay);

	const ref = {
		__proto__: null,
		clear: host.clearTimeout,
		value: tmr
	};

	localReflectApply(localWeakMapSet, TIMERS, [obj, ref]);
	return obj;
};

// eslint-disable-next-line no-shadow
global.setInterval = function setInterval(callback, interval, ...args) {
	if (typeof callback !== 'function') throw new LocalTypeError('"callback" argument must be a function');
	const obj = new Interval();
	const cb = () => {
		localReflectApply(callback, null, args);
	};
	const tmr = host.setInterval(cb, interval);

	const ref = {
		__proto__: null,
		clear: host.clearInterval,
		value: tmr
	};

	localReflectApply(localWeakMapSet, TIMERS, [obj, ref]);
	return obj;
};

// eslint-disable-next-line no-shadow
global.setImmediate = function setImmediate(callback, ...args) {
	if (typeof callback !== 'function') throw new LocalTypeError('"callback" argument must be a function');
	const obj = new Immediate();
	const cb = () => {
		localReflectApply(callback, null, args);
	};
	const tmr = host.setImmediate(cb);

	const ref = {
		__proto__: null,
		clear: host.clearImmediate,
		value: tmr
	};

	localReflectApply(localWeakMapSet, TIMERS, [obj, ref]);
	return obj;
};

// eslint-disable-next-line no-shadow
global.clearTimeout = function clearTimeout(timeout) {
	clearTimer(timeout);
};

// eslint-disable-next-line no-shadow
global.clearInterval = function clearInterval(interval) {
	clearTimer(interval);
};

// eslint-disable-next-line no-shadow
global.clearImmediate = function clearImmediate(immediate) {
	clearTimer(immediate);
};

const localProcess = host.process;

const LISTENERS = new LocalWeakMap();
const LISTENER_HANDLER = new LocalWeakMap();

/**
 *
 * @param {*} name
 * @param {*} handler
 * @this process
 * @return {this}
 */
function addListener(name, handler) {
	if (name !== 'beforeExit' && name !== 'exit') {
		throw new LocalError(`Access denied to listen for '${name}' event.`);
	}

	let cb = localReflectApply(localWeakMapGet, LISTENERS, [handler]);
	if (!cb) {
		cb = () => {
			handler();
		};
		localReflectApply(localWeakMapSet, LISTENER_HANDLER, [cb, handler]);
		localReflectApply(localWeakMapSet, LISTENERS, [handler, cb]);
	}

	localProcess.on(name, cb);

	return this;
}

/**
 *
 * @this process
 * @return {this}
 */
// eslint-disable-next-line no-shadow
function process() {
	return this;
}

const baseUptime = localProcess.uptime();

// FIXME wrong class structure
global.process = {
	__proto__: process.prototype,
	argv: optionArgv !== undefined ? optionArgv : [],
	title: localProcess.title,
	version: localProcess.version,
	versions: localProcess.versions,
	arch: localProcess.arch,
	platform: localProcess.platform,
	env: optionEnv !== undefined ? optionEnv : {},
	pid: localProcess.pid,
	features: localProcess.features,
	nextTick: function nextTick(callback, ...args) {
		if (typeof callback !== 'function') {
			throw new LocalError('Callback must be a function.');
		}

		localProcess.nextTick(()=>{
			localReflectApply(callback, null, args);
		});
	},
	hrtime: function hrtime(time) {
		return localProcess.hrtime(time);
	},
	uptime: function uptime() {
		return localProcess.uptime() - baseUptime;
	},
	cwd: function cwd() {
		return localProcess.cwd();
	},
	addListener,
	on: addListener,

	once: function once(name, handler) {
		if (name !== 'beforeExit' && name !== 'exit') {
			throw new LocalError(`Access denied to listen for '${name}' event.`);
		}

		let triggered = false;
		const cb = () => {
			if (triggered) return;
			triggered = true;
			localProcess.removeListener(name, cb);
			handler();
		};
		localReflectApply(localWeakMapSet, LISTENER_HANDLER, [cb, handler]);

		localProcess.on(name, cb);

		return this;
	},

	listeners: function listeners(name) {
		if (name !== 'beforeExit' && name !== 'exit') {
			// Maybe add ({__proto__:null})[name] to throw when name fails in https://tc39.es/ecma262/#sec-topropertykey.
			return [];
		}

		// Filter out listeners, which were not created in this sandbox
		const all = localProcess.listeners(name);
		const filtered = [];
		let j = 0;
		for (let i = 0; i < all.length; i++) {
			const h = localReflectApply(localWeakMapGet, LISTENER_HANDLER, [all[i]]);
			if (h) {
				if (!localReflectDefineProperty(filtered, j, {
					__proto__: null,
					value: h,
					writable: true,
					enumerable: true,
					configurable: true
				})) throw new LocalError('Unexpected');
				j++;
			}
		}
		return filtered;
	},

	removeListener: function removeListener(name, handler) {
		if (name !== 'beforeExit' && name !== 'exit') {
			return this;
		}

		const cb = localReflectApply(localWeakMapGet, LISTENERS, [handler]);
		if (cb) localProcess.removeListener(name, cb);

		return this;
	},

	umask: function umask() {
		if (arguments.length) {
			throw new LocalError('Access denied to set umask.');
		}

		return localProcess.umask();
	}
};

if (optionConsole === 'inherit') {
	global.console = host.console;
} else if (optionConsole === 'redirect') {
	global.console = {
		debug(...args) {
			emitArgs('console.debug', args);
		},
		log(...args) {
			emitArgs('console.log', args);
		},
		info(...args) {
			emitArgs('console.info', args);
		},
		warn(...args) {
			emitArgs('console.warn', args);
		},
		error(...args) {
			emitArgs('console.error', args);
		},
		dir(...args) {
			emitArgs('console.dir', args);
		},
		time() {},
		timeEnd() {},
		trace(...args) {
			emitArgs('console.trace', args);
		}
	};
}

return {
	__proto__: null,
	Module,
	jsonParse: JSON.parse,
	createRequireForModule,
	requireImpl
};
