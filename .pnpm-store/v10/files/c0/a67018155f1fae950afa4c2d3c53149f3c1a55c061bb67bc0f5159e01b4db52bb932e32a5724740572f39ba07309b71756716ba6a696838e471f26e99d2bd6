'use strict';

/* Drop this dependency once node.js 12 is required. */
const fromEntries = require('fromentries');

const state = getState(1);

function getState(version) {
	const stateId = Symbol.for('process-on-spawn@*:singletonId');

	if (stateId in global === false) {
		/* Hopefully version and unwrap forward compatibility is never actually needed */
		Object.defineProperty(global, stateId, {
			writable: true,
			value: {
				version,
				listeners: [],
				unwrap: wrapSpawnFunctions()
			}
		});
	}

	return global[stateId];
}

function wrappedSpawnFunction(fn) {
	return function (options) {
		let env = fromEntries(
			options.envPairs.map(nvp => nvp.split(/^([^=]*)=/).slice(1))
		);

		const opts = Object.create(null, {
			env: {
				enumerable: true,
				get() {
					return env;
				},
				set(value) {
					if (!value || typeof value !== 'object') {
						throw new TypeError('env must be an object');
					}

					env = value;
				}
			},
			cwd: {
				enumerable: true,
				get() {
					return options.cwd || process.cwd();
				}
			}
		});

		const args = [...options.args];
		Object.freeze(args);
		Object.assign(opts, {
			execPath: options.file,
			args,
			detached: Boolean(options.detached),
			uid: options.uid,
			gid: options.gid,
			windowsVerbatimArguments: Boolean(options.windowsVerbatimArguments),
			windowsHide: Boolean(options.windowsHide)
		});
		Object.freeze(opts);

		state.listeners.forEach(listener => {
			listener(opts);
		});

		options.envPairs = Object.entries(opts.env).map(([name, value]) => `${name}=${value}`);

		return fn.call(this, options);
	};
}

function wrapSpawnFunctions() {
	const {ChildProcess} = require('child_process');

	/* eslint-disable-next-line node/no-deprecated-api */
	const spawnSyncBinding = process.binding('spawn_sync');
	const originalSync = spawnSyncBinding.spawn;
	const originalAsync = ChildProcess.prototype.spawn;

	spawnSyncBinding.spawn = wrappedSpawnFunction(spawnSyncBinding.spawn);
	ChildProcess.prototype.spawn = wrappedSpawnFunction(ChildProcess.prototype.spawn);

	/* istanbul ignore next: forward compatibility code */
	/* c8 ignore next */
	return () => {
		/* c8 ignore next */
		spawnSyncBinding.spawn = originalSync;
		/* c8 ignore next */
		ChildProcess.prototype.spawn = originalAsync;
	};
}

module.exports = {
	addListener(listener) {
		state.listeners.push(listener);
	},
	prependListener(listener) {
		state.listeners.unshift(listener);
	},
	removeListener(listener) {
		const idx = state.listeners.indexOf(listener);
		if (idx !== -1) {
			state.listeners.splice(idx, 1);
		}
	},
	removeAllListeners() {
		state.listeners = [];
	}
};
