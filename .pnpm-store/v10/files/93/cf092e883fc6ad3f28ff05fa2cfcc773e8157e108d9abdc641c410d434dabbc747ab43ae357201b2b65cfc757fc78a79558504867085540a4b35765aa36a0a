
const fs = require('fs');
const nmod = require('module');
const {EventEmitter} = require('events');
const util = require('util');
const {VMScript} = require('./script');
const {VM} = require('./vm');

const eventsModules = new WeakMap();

function defaultBuiltinLoaderEvents(vm) {
	return eventsModules.get(vm);
}

let cacheBufferScript;

function defaultBuiltinLoaderBuffer(vm) {
	if (!cacheBufferScript) {
		cacheBufferScript = new VMScript('return buffer=>({Buffer: buffer});', {__proto__: null, filename: 'buffer.js'});
	}
	const makeBuffer = vm.run(cacheBufferScript, {__proto__: null, strict: true, wrapper: 'none'});
	return makeBuffer(Buffer);
}

let cacheUtilScript;

function defaultBuiltinLoaderUtil(vm) {
	if (!cacheUtilScript) {
		cacheUtilScript = new VMScript(`return function inherits(ctor, superCtor) {
			ctor.super_ = superCtor;
			Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
		}`, {__proto__: null, filename: 'util.js'});
	}
	const inherits = vm.run(cacheUtilScript, {__proto__: null, strict: true, wrapper: 'none'});
	const copy = Object.assign({}, util);
	copy.inherits = inherits;
	return vm.readonly(copy);
}

const BUILTIN_MODULES = (nmod.builtinModules || Object.getOwnPropertyNames(process.binding('natives'))).filter(s=>!s.startsWith('internal/'));

let EventEmitterReferencingAsyncResourceClass = null;
if (EventEmitter.EventEmitterAsyncResource) {
	// eslint-disable-next-line global-require
	const {AsyncResource} = require('async_hooks');
	const kEventEmitter = Symbol('kEventEmitter');
	class EventEmitterReferencingAsyncResource extends AsyncResource {
		constructor(ee, type, options) {
			super(type, options);
			this[kEventEmitter] = ee;
		}
		get eventEmitter() {
			return this[kEventEmitter];
		}
	}
	EventEmitterReferencingAsyncResourceClass = EventEmitterReferencingAsyncResource;
}

let cacheEventsScript;

const SPECIAL_MODULES = {
	events: {
		init(vm) {
			if (!cacheEventsScript) {
				const eventsSource = fs.readFileSync(`${__dirname}/events.js`, 'utf8');
				cacheEventsScript = new VMScript(`(function (fromhost) { const module = {}; module.exports={};{ ${eventsSource}
	} return module.exports;})`, {filename: 'events.js'});
			}
			const closure = VM.prototype.run.call(vm, cacheEventsScript);
			const eventsInstance = closure(vm.readonly({
				kErrorMonitor: EventEmitter.errorMonitor,
				once: EventEmitter.once,
				on: EventEmitter.on,
				getEventListeners: EventEmitter.getEventListeners,
				EventEmitterReferencingAsyncResource: EventEmitterReferencingAsyncResourceClass
			}));
			eventsModules.set(vm, eventsInstance);
			vm._addProtoMapping(EventEmitter.prototype, eventsInstance.EventEmitter.prototype);
		},
		load: defaultBuiltinLoaderEvents
	},
	buffer: defaultBuiltinLoaderBuffer,
	util: defaultBuiltinLoaderUtil
};

function addDefaultBuiltin(builtins, key, hostRequire) {
	if (builtins.has(key)) return;
	const special = SPECIAL_MODULES[key];
	builtins.set(key, special ? special : vm => vm.readonly(hostRequire(key)));
}


function makeBuiltinsFromLegacyOptions(builtins, hostRequire, mocks, overrides) {
	const res = new Map();
	if (mocks) {
		const keys = Object.getOwnPropertyNames(mocks);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			res.set(key, (tvm) => tvm.readonly(mocks[key]));
		}
	}
	if (overrides) {
		const keys = Object.getOwnPropertyNames(overrides);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			res.set(key, overrides[key]);
		}
	}
	if (Array.isArray(builtins)) {
		const def = builtins.indexOf('*') >= 0;
		if (def) {
			for (let i = 0; i < BUILTIN_MODULES.length; i++) {
				const name = BUILTIN_MODULES[i];
				if (builtins.indexOf(`-${name}`) === -1) {
					addDefaultBuiltin(res, name, hostRequire);
				}
			}
		} else {
			for (let i = 0; i < BUILTIN_MODULES.length; i++) {
				const name = BUILTIN_MODULES[i];
				if (builtins.indexOf(name) !== -1) {
					addDefaultBuiltin(res, name, hostRequire);
				}
			}
		}
	} else if (builtins) {
		for (let i = 0; i < BUILTIN_MODULES.length; i++) {
			const name = BUILTIN_MODULES[i];
			if (builtins[name]) {
				addDefaultBuiltin(res, name, hostRequire);
			}
		}
	}
	return res;
}

function makeBuiltins(builtins, hostRequire) {
	const res = new Map();
	for (let i = 0; i < builtins.length; i++) {
		const name = builtins[i];
		addDefaultBuiltin(res, name, hostRequire);
	}
	return res;
}

exports.makeBuiltinsFromLegacyOptions = makeBuiltinsFromLegacyOptions;
exports.makeBuiltins = makeBuiltins;
