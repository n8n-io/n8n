'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.PubSubRegistry = void 0;
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const pubsub_eventbus_1 = require('./pubsub.eventbus');
let PubSubRegistry = class PubSubRegistry {
	constructor(logger, instanceSettings, pubSubMetadata, pubsubEventBus) {
		this.logger = logger;
		this.instanceSettings = instanceSettings;
		this.pubSubMetadata = pubSubMetadata;
		this.pubsubEventBus = pubsubEventBus;
		this.logger = this.logger.scoped('pubsub');
	}
	init() {
		const { instanceSettings, pubSubMetadata } = this;
		const handlers = pubSubMetadata.getHandlers();
		for (const { eventHandlerClass, methodName, eventName, filter } of handlers) {
			const handlerClass = di_1.Container.get(eventHandlerClass);
			if (!filter?.instanceType || filter.instanceType === instanceSettings.instanceType) {
				this.logger.debug(
					`Registered a "${eventName}" event handler on ${eventHandlerClass.name}#${methodName}`,
				);
				this.pubsubEventBus.on(eventName, async (...args) => {
					const shouldTrigger =
						filter?.instanceType !== 'main' ||
						!filter.instanceRole ||
						filter.instanceRole === instanceSettings.instanceRole;
					if (shouldTrigger) await handlerClass[methodName].call(handlerClass, ...args);
				});
			}
		}
	}
};
exports.PubSubRegistry = PubSubRegistry;
exports.PubSubRegistry = PubSubRegistry = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.InstanceSettings,
			decorators_1.PubSubMetadata,
			pubsub_eventbus_1.PubSubEventBus,
		]),
	],
	PubSubRegistry,
);
//# sourceMappingURL=pubsub.registry.js.map
