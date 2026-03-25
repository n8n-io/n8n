'use strict';

const {anyMap, producersMap, eventsMap} = require('./maps.js');

const anyProducer = Symbol('anyProducer');
const resolvedPromise = Promise.resolve();

// Define symbols for "meta" events.
const listenerAdded = Symbol('listenerAdded');
const listenerRemoved = Symbol('listenerRemoved');

let canEmitMetaEvents = false;
let isGlobalDebugEnabled = false;

function assertEventName(eventName) {
	if (typeof eventName !== 'string' && typeof eventName !== 'symbol' && typeof eventName !== 'number') {
		throw new TypeError('`eventName` must be a string, symbol, or number');
	}
}

function assertListener(listener) {
	if (typeof listener !== 'function') {
		throw new TypeError('listener must be a function');
	}
}

function getListeners(instance, eventName) {
	const events = eventsMap.get(instance);
	if (!events.has(eventName)) {
		return;
	}

	return events.get(eventName);
}

function getEventProducers(instance, eventName) {
	const key = typeof eventName === 'string' || typeof eventName === 'symbol' || typeof eventName === 'number' ? eventName : anyProducer;
	const producers = producersMap.get(instance);
	if (!producers.has(key)) {
		return;
	}

	return producers.get(key);
}

function enqueueProducers(instance, eventName, eventData) {
	const producers = producersMap.get(instance);
	if (producers.has(eventName)) {
		for (const producer of producers.get(eventName)) {
			producer.enqueue(eventData);
		}
	}

	if (producers.has(anyProducer)) {
		const item = Promise.all([eventName, eventData]);
		for (const producer of producers.get(anyProducer)) {
			producer.enqueue(item);
		}
	}
}

function iterator(instance, eventNames) {
	eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];

	let isFinished = false;
	let flush = () => {};
	let queue = [];

	const producer = {
		enqueue(item) {
			queue.push(item);
			flush();
		},
		finish() {
			isFinished = true;
			flush();
		}
	};

	for (const eventName of eventNames) {
		let set = getEventProducers(instance, eventName);
		if (!set) {
			set = new Set();
			const producers = producersMap.get(instance);
			producers.set(eventName, set);
		}

		set.add(producer);
	}

	return {
		async next() {
			if (!queue) {
				return {done: true};
			}

			if (queue.length === 0) {
				if (isFinished) {
					queue = undefined;
					return this.next();
				}

				await new Promise(resolve => {
					flush = resolve;
				});

				return this.next();
			}

			return {
				done: false,
				value: await queue.shift()
			};
		},

		async return(value) {
			queue = undefined;

			for (const eventName of eventNames) {
				const set = getEventProducers(instance, eventName);
				if (set) {
					set.delete(producer);
					if (set.size === 0) {
						const producers = producersMap.get(instance);
						producers.delete(eventName);
					}
				}
			}

			flush();

			return arguments.length > 0 ?
				{done: true, value: await value} :
				{done: true};
		},

		[Symbol.asyncIterator]() {
			return this;
		}
	};
}

function defaultMethodNamesOrAssert(methodNames) {
	if (methodNames === undefined) {
		return allEmitteryMethods;
	}

	if (!Array.isArray(methodNames)) {
		throw new TypeError('`methodNames` must be an array of strings');
	}

	for (const methodName of methodNames) {
		if (!allEmitteryMethods.includes(methodName)) {
			if (typeof methodName !== 'string') {
				throw new TypeError('`methodNames` element must be a string');
			}

			throw new Error(`${methodName} is not Emittery method`);
		}
	}

	return methodNames;
}

const isMetaEvent = eventName => eventName === listenerAdded || eventName === listenerRemoved;

function emitMetaEvent(emitter, eventName, eventData) {
	if (isMetaEvent(eventName)) {
		try {
			canEmitMetaEvents = true;
			emitter.emit(eventName, eventData);
		} finally {
			canEmitMetaEvents = false;
		}
	}
}

class Emittery {
	static mixin(emitteryPropertyName, methodNames) {
		methodNames = defaultMethodNamesOrAssert(methodNames);
		return target => {
			if (typeof target !== 'function') {
				throw new TypeError('`target` must be function');
			}

			for (const methodName of methodNames) {
				if (target.prototype[methodName] !== undefined) {
					throw new Error(`The property \`${methodName}\` already exists on \`target\``);
				}
			}

			function getEmitteryProperty() {
				Object.defineProperty(this, emitteryPropertyName, {
					enumerable: false,
					value: new Emittery()
				});
				return this[emitteryPropertyName];
			}

			Object.defineProperty(target.prototype, emitteryPropertyName, {
				enumerable: false,
				get: getEmitteryProperty
			});

			const emitteryMethodCaller = methodName => function (...args) {
				return this[emitteryPropertyName][methodName](...args);
			};

			for (const methodName of methodNames) {
				Object.defineProperty(target.prototype, methodName, {
					enumerable: false,
					value: emitteryMethodCaller(methodName)
				});
			}

			return target;
		};
	}

	static get isDebugEnabled() {
		if (typeof process !== 'object') {
			return isGlobalDebugEnabled;
		}

		const {env} = process || {env: {}};
		return env.DEBUG === 'emittery' || env.DEBUG === '*' || isGlobalDebugEnabled;
	}

	static set isDebugEnabled(newValue) {
		isGlobalDebugEnabled = newValue;
	}

	constructor(options = {}) {
		anyMap.set(this, new Set());
		eventsMap.set(this, new Map());
		producersMap.set(this, new Map());

		producersMap.get(this).set(anyProducer, new Set());

		this.debug = options.debug || {};

		if (this.debug.enabled === undefined) {
			this.debug.enabled = false;
		}

		if (!this.debug.logger) {
			this.debug.logger = (type, debugName, eventName, eventData) => {
				try {
					// TODO: Use https://github.com/sindresorhus/safe-stringify when the package is more mature. Just copy-paste the code.
					eventData = JSON.stringify(eventData);
				} catch {
					eventData = `Object with the following keys failed to stringify: ${Object.keys(eventData).join(',')}`;
				}

				if (typeof eventName === 'symbol' || typeof eventName === 'number') {
					eventName = eventName.toString();
				}

				const currentTime = new Date();
				const logTime = `${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}.${currentTime.getMilliseconds()}`;
				console.log(`[${logTime}][emittery:${type}][${debugName}] Event Name: ${eventName}\n\tdata: ${eventData}`);
			};
		}
	}

	logIfDebugEnabled(type, eventName, eventData) {
		if (Emittery.isDebugEnabled || this.debug.enabled) {
			this.debug.logger(type, this.debug.name, eventName, eventData);
		}
	}

	on(eventNames, listener) {
		assertListener(listener);

		eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
		for (const eventName of eventNames) {
			assertEventName(eventName);
			let set = getListeners(this, eventName);
			if (!set) {
				set = new Set();
				const events = eventsMap.get(this);
				events.set(eventName, set);
			}

			set.add(listener);

			this.logIfDebugEnabled('subscribe', eventName, undefined);

			if (!isMetaEvent(eventName)) {
				emitMetaEvent(this, listenerAdded, {eventName, listener});
			}
		}

		return this.off.bind(this, eventNames, listener);
	}

	off(eventNames, listener) {
		assertListener(listener);

		eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
		for (const eventName of eventNames) {
			assertEventName(eventName);
			const set = getListeners(this, eventName);
			if (set) {
				set.delete(listener);
				if (set.size === 0) {
					const events = eventsMap.get(this);
					events.delete(eventName);
				}
			}

			this.logIfDebugEnabled('unsubscribe', eventName, undefined);

			if (!isMetaEvent(eventName)) {
				emitMetaEvent(this, listenerRemoved, {eventName, listener});
			}
		}
	}

	once(eventNames) {
		let off_;

		const promise = new Promise(resolve => {
			off_ = this.on(eventNames, data => {
				off_();
				resolve(data);
			});
		});

		promise.off = off_;
		return promise;
	}

	events(eventNames) {
		eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
		for (const eventName of eventNames) {
			assertEventName(eventName);
		}

		return iterator(this, eventNames);
	}

	async emit(eventName, eventData) {
		assertEventName(eventName);

		if (isMetaEvent(eventName) && !canEmitMetaEvents) {
			throw new TypeError('`eventName` cannot be meta event `listenerAdded` or `listenerRemoved`');
		}

		this.logIfDebugEnabled('emit', eventName, eventData);

		enqueueProducers(this, eventName, eventData);

		const listeners = getListeners(this, eventName) || new Set();
		const anyListeners = anyMap.get(this);
		const staticListeners = [...listeners];
		const staticAnyListeners = isMetaEvent(eventName) ? [] : [...anyListeners];

		await resolvedPromise;
		await Promise.all([
			...staticListeners.map(async listener => {
				if (listeners.has(listener)) {
					return listener(eventData);
				}
			}),
			...staticAnyListeners.map(async listener => {
				if (anyListeners.has(listener)) {
					return listener(eventName, eventData);
				}
			})
		]);
	}

	async emitSerial(eventName, eventData) {
		assertEventName(eventName);

		if (isMetaEvent(eventName) && !canEmitMetaEvents) {
			throw new TypeError('`eventName` cannot be meta event `listenerAdded` or `listenerRemoved`');
		}

		this.logIfDebugEnabled('emitSerial', eventName, eventData);

		const listeners = getListeners(this, eventName) || new Set();
		const anyListeners = anyMap.get(this);
		const staticListeners = [...listeners];
		const staticAnyListeners = [...anyListeners];

		await resolvedPromise;
		/* eslint-disable no-await-in-loop */
		for (const listener of staticListeners) {
			if (listeners.has(listener)) {
				await listener(eventData);
			}
		}

		for (const listener of staticAnyListeners) {
			if (anyListeners.has(listener)) {
				await listener(eventName, eventData);
			}
		}
		/* eslint-enable no-await-in-loop */
	}

	onAny(listener) {
		assertListener(listener);

		this.logIfDebugEnabled('subscribeAny', undefined, undefined);

		anyMap.get(this).add(listener);
		emitMetaEvent(this, listenerAdded, {listener});
		return this.offAny.bind(this, listener);
	}

	anyEvent() {
		return iterator(this);
	}

	offAny(listener) {
		assertListener(listener);

		this.logIfDebugEnabled('unsubscribeAny', undefined, undefined);

		emitMetaEvent(this, listenerRemoved, {listener});
		anyMap.get(this).delete(listener);
	}

	clearListeners(eventNames) {
		eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];

		for (const eventName of eventNames) {
			this.logIfDebugEnabled('clear', eventName, undefined);

			if (typeof eventName === 'string' || typeof eventName === 'symbol' || typeof eventName === 'number') {
				const set = getListeners(this, eventName);
				if (set) {
					set.clear();
				}

				const producers = getEventProducers(this, eventName);
				if (producers) {
					for (const producer of producers) {
						producer.finish();
					}

					producers.clear();
				}
			} else {
				anyMap.get(this).clear();

				for (const [eventName, listeners] of eventsMap.get(this).entries()) {
					listeners.clear();
					eventsMap.get(this).delete(eventName);
				}

				for (const [eventName, producers] of producersMap.get(this).entries()) {
					for (const producer of producers) {
						producer.finish();
					}

					producers.clear();
					producersMap.get(this).delete(eventName);
				}
			}
		}
	}

	listenerCount(eventNames) {
		eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
		let count = 0;

		for (const eventName of eventNames) {
			if (typeof eventName === 'string') {
				count += anyMap.get(this).size + (getListeners(this, eventName) || new Set()).size +
					(getEventProducers(this, eventName) || new Set()).size + (getEventProducers(this) || new Set()).size;
				continue;
			}

			if (typeof eventName !== 'undefined') {
				assertEventName(eventName);
			}

			count += anyMap.get(this).size;

			for (const value of eventsMap.get(this).values()) {
				count += value.size;
			}

			for (const value of producersMap.get(this).values()) {
				count += value.size;
			}
		}

		return count;
	}

	bindMethods(target, methodNames) {
		if (typeof target !== 'object' || target === null) {
			throw new TypeError('`target` must be an object');
		}

		methodNames = defaultMethodNamesOrAssert(methodNames);

		for (const methodName of methodNames) {
			if (target[methodName] !== undefined) {
				throw new Error(`The property \`${methodName}\` already exists on \`target\``);
			}

			Object.defineProperty(target, methodName, {
				enumerable: false,
				value: this[methodName].bind(this)
			});
		}
	}
}

const allEmitteryMethods = Object.getOwnPropertyNames(Emittery.prototype).filter(v => v !== 'constructor');

Object.defineProperty(Emittery, 'listenerAdded', {
	value: listenerAdded,
	writable: false,
	enumerable: true,
	configurable: false
});
Object.defineProperty(Emittery, 'listenerRemoved', {
	value: listenerRemoved,
	writable: false,
	enumerable: true,
	configurable: false
});

module.exports = Emittery;
