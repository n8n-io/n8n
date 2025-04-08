/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { client, v2 } from '@datadog/datadog-api-client';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationDatadogOptions,
} from 'n8n-workflow';

import { MessageEventBusDestination } from './message-event-bus-destination.ee';
import { eventMessageGenericDestinationTestEvent } from '../event-message-classes/event-message-generic';
import type { MessageEventBus, MessageWithCallback } from '../message-event-bus/message-event-bus';

export const isMessageEventBusDestinationDatadogOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationDatadogOptions => {
	const o = candidate as MessageEventBusDestinationDatadogOptions;
	if (!o) return false;
	return o.site !== undefined;
};

export class MessageEventBusDestinationDatadog
	extends MessageEventBusDestination
	implements MessageEventBusDestinationDatadogOptions
{
	site: string;

	apiKey?: string;

	appKey?: string;

	ddsource?: string;

	ddtags?: string;

	hostname?: string;

	service?: string;

	sendPayload: boolean;

	datadogConfig: client.Configuration;

	datadogApiInstance: v2.LogsApi;

	configOpts: ConfigOpts;

	constructor(
		eventBusInstance: MessageEventBus,
		options: MessageEventBusDestinationDatadogOptions,
	) {
		super(eventBusInstance, options);
		this.label = options.label ?? 'Datadog URL';
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.datadog;
		this.site = options.site;
		if (options.sendPayload) this.sendPayload = options.sendPayload;

		if (options.apiKey) {
			this.configOpts = {
				authMethods: {
					apiKeyAuth: options.apiKey as string,
				},
			};
		}

		if (options.appKey) {
			this.configOpts = {
				authMethods: {
					appKeyAuth: options.appKey as string,
				},
			};
		}
		this.datadogConfig = client.createConfiguration(this.configOpts);
		this.datadogConfig.setServerVariables({ site: this.site });
		this.datadogApiInstance = new v2.LogsApi(this.datadogConfig);
	}

	// This is called when the event bus is started
	async receiveFromEventBus(emitterPayload: MessageWithCallback): Promise<boolean> {
		const { msg, confirmCallback } = emitterPayload;
		let sendResult = false;

		if (!this.datadogApiInstance) return sendResult;
		if (msg.eventName !== eventMessageGenericDestinationTestEvent) {
			if (!this.license.isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
		try {
			const payload = this.anonymizeAuditMessages ? msg.anonymize() : msg.payload;

			let params: v2.LogsApiSubmitLogRequest;

			if (this.sendPayload && payload !== undefined) {
				params = {
					body: [
						{
							message: `${msg.ts} [${msg.eventName}][${msg.id}] ${JSON.stringify(payload)}`,
							ddsource: this.ddsource ?? 'n8n',
							ddtags: this.ddtags,
							hostname: this.hostname,
							service: this.service,
						},
					],
				};
			} else {
				params = {
					body: [
						{
							message: `${msg.ts} [${msg.eventName}][${msg.id}]`,
							ddsource: this.ddsource ?? 'n8n',
							ddtags: this.ddtags,
							hostname: this.hostname,
							service: this.service,
						},
					],
				};
			}

			const datadogResult = await this.datadogApiInstance.submitLog(params);

			if (datadogResult) {
				// eventBus.confirmSent(msg, { id: this.id, name: this.label });
				confirmCallback(msg, { id: this.id, name: this.label });
				sendResult = true;
			}
		} catch (error) {
			this.logger.warn(
				`Datadog destination ${this.label} failed to send message to: ${this.site} - ${
					(error as Error).message
				}`,
			);
		}
		return sendResult;
	}

	serialize(): MessageEventBusDestinationDatadogOptions {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
			site: this.site,
			apiKey: this.apiKey,
			appKey: this.appKey,
			ddsource: this.ddsource,
			ddtags: this.ddtags,
			hostname: this.hostname,
			service: this.service,
			sendPayload: this.sendPayload,
		};
	}

	static deserialize(
		eventBusInstance: MessageEventBus,
		data: MessageEventBusDestinationOptions,
	): MessageEventBusDestinationDatadog | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationTypeNames.sentry &&
			isMessageEventBusDestinationDatadogOptions(data)
		) {
			return new MessageEventBusDestinationDatadog(eventBusInstance, data);
		}
		return null;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	async close() {
		await super.close();
		//await this.sentryClient?.close();
	}
}

export type ConfigOpts = {
	authMethods: {
		apiKeyAuth?: string;
		appKeyAuth?: string;
	};
};
