'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MessageEventBusDestination = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const uuid_1 = require('uuid');
const license_1 = require('@/license');
class MessageEventBusDestination {
	constructor(eventBusInstance, options) {
		this.credentials = {};
		this.logger = di_1.Container.get(backend_common_1.Logger);
		this.license = di_1.Container.get(license_1.License);
		this.eventBusInstance = eventBusInstance;
		this.id = !options.id || options.id.length !== 36 ? (0, uuid_1.v4)() : options.id;
		this.__type = options.__type ?? '$$AbstractMessageEventBusDestination';
		this.label = options.label ?? 'Log Destination';
		this.enabled = options.enabled ?? false;
		this.subscribedEvents = options.subscribedEvents ?? [];
		this.anonymizeAuditMessages = options.anonymizeAuditMessages ?? false;
		if (options.credentials) this.credentials = options.credentials;
		this.logger.debug(`${this.__type}(${this.id}) event destination constructed`);
	}
	startListening() {
		if (this.enabled) {
			this.eventBusInstance.on(this.getId(), async (msg, confirmCallback) => {
				await this.receiveFromEventBus({ msg, confirmCallback });
			});
			this.logger.debug(`${this.id} listener started`);
		}
	}
	stopListening() {
		this.eventBusInstance.removeAllListeners(this.getId());
	}
	enable() {
		this.enabled = true;
		this.startListening();
	}
	disable() {
		this.enabled = false;
		this.stopListening();
	}
	getId() {
		return this.id;
	}
	hasSubscribedToEvent(msg) {
		if (!this.enabled) return false;
		for (const eventName of this.subscribedEvents) {
			if (eventName === '*' || msg.eventName.startsWith(eventName)) {
				return true;
			}
		}
		return false;
	}
	async saveToDb() {
		const data = {
			id: this.getId(),
			destination: this.serialize(),
		};
		const dbResult = await di_1.Container.get(db_1.EventDestinationsRepository).upsert(data, {
			skipUpdateIfNoValuesChanged: true,
			conflictPaths: ['id'],
		});
		return dbResult;
	}
	async deleteFromDb() {
		return await MessageEventBusDestination.deleteFromDb(this.getId());
	}
	static async deleteFromDb(id) {
		const dbResult = await di_1.Container.get(db_1.EventDestinationsRepository).delete({ id });
		return dbResult;
	}
	serialize() {
		return {
			__type: this.__type,
			id: this.getId(),
			label: this.label,
			enabled: this.enabled,
			subscribedEvents: this.subscribedEvents,
			anonymizeAuditMessages: this.anonymizeAuditMessages,
		};
	}
	toString() {
		return JSON.stringify(this.serialize());
	}
	close() {
		this.stopListening();
	}
}
exports.MessageEventBusDestination = MessageEventBusDestination;
//# sourceMappingURL=message-event-bus-destination.ee.js.map
