import { Logger } from '@n8n/backend-common';
import {
	LOGSTREAMING_CB_DEFAULT_CONCURRENT_HALF_OPEN_REQUESTS,
	LOGSTREAMING_CB_DEFAULT_FAILURE_WINDOW_MS,
	LOGSTREAMING_CB_DEFAULT_HALF_OPEN_REQUESTS,
	LOGSTREAMING_CB_DEFAULT_MAX_DURATION_MS,
	LOGSTREAMING_CB_DEFAULT_MAX_FAILURES,
} from '@n8n/constants';
import { Container } from '@n8n/di';
import type { INodeCredentials, MessageEventBusDestinationOptions } from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { AbstractEventMessage } from '@/eventbus/event-message-classes/abstract-event-message';
import type {
	MessageEventBus,
	MessageWithCallback,
} from '@/eventbus/message-event-bus/message-event-bus';
import { License } from '@/license';
import { CircuitBreaker } from '@/utils/circuit-breaker';

export abstract class MessageEventBusDestination implements MessageEventBusDestinationOptions {
	// Since you can't have static abstract functions - this just serves as a reminder that you need to implement these. Please.
	// static abstract deserialize(): MessageEventBusDestination | null;
	readonly id: string;

	readonly eventBusInstance: MessageEventBus;

	protected readonly logger: Logger;

	protected readonly license: License;

	protected circuitBreakerInstance: CircuitBreaker;

	__type: MessageEventBusDestinationTypeNames;

	label: string;

	enabled: boolean;

	subscribedEvents: string[];

	credentials: INodeCredentials = {};

	anonymizeAuditMessages: boolean;

	constructor(eventBusInstance: MessageEventBus, options: MessageEventBusDestinationOptions) {
		// @TODO: Use DI
		this.logger = Container.get(Logger);
		this.license = Container.get(License);

		const timeout = options.circuitBreaker?.maxDuration ?? LOGSTREAMING_CB_DEFAULT_MAX_DURATION_MS;
		const maxFailures = options.circuitBreaker?.maxFailures ?? LOGSTREAMING_CB_DEFAULT_MAX_FAILURES;
		const halfOpenRequests =
			options.circuitBreaker?.halfOpenRequests ?? LOGSTREAMING_CB_DEFAULT_HALF_OPEN_REQUESTS;
		const failureWindow =
			options.circuitBreaker?.failureWindow ?? LOGSTREAMING_CB_DEFAULT_FAILURE_WINDOW_MS;
		const maxConcurrentHalfOpenRequests =
			options.circuitBreaker?.maxConcurrentHalfOpenRequests ??
			LOGSTREAMING_CB_DEFAULT_CONCURRENT_HALF_OPEN_REQUESTS;

		this.circuitBreakerInstance = new CircuitBreaker({
			timeout,
			maxFailures,
			halfOpenRequests,
			failureWindow,
			maxConcurrentHalfOpenRequests,
		});

		this.eventBusInstance = eventBusInstance;
		this.id = !options.id || options.id.length !== 36 ? uuid() : options.id;
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.abstract;
		this.label = options.label ?? 'Log Destination';
		this.enabled = options.enabled ?? false;
		this.subscribedEvents = options.subscribedEvents ?? [];
		this.anonymizeAuditMessages = options.anonymizeAuditMessages ?? false;
		if (options.credentials) this.credentials = options.credentials;
		this.logger.debug(`${this.__type}(${this.id}) event destination constructed`);
	}

	getId() {
		return this.id;
	}

	hasSubscribedToEvent(msg: AbstractEventMessage) {
		if (!this.enabled) return false;
		for (const eventName of this.subscribedEvents) {
			if (eventName === '*' || msg.eventName.startsWith(eventName)) {
				return true;
			}
		}
		return false;
	}

	serialize(): MessageEventBusDestinationOptions {
		return {
			__type: this.__type,
			id: this.getId(),
			label: this.label,
			enabled: this.enabled,
			subscribedEvents: this.subscribedEvents,
			anonymizeAuditMessages: this.anonymizeAuditMessages,
		};
	}

	abstract receiveFromEventBus(emitterPayload: MessageWithCallback): Promise<boolean>;

	/**
	 * Send a message to this destination with circuit breaker protection
	 */
	async sendMessage(emitterPayload: MessageWithCallback): Promise<boolean> {
		return await this.circuitBreakerInstance.execute(async () => {
			return await this.receiveFromEventBus(emitterPayload);
		});
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	async close(): Promise<void> {
		this.enabled = false;
	}
}
