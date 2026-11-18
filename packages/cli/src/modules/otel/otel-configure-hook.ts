import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { isRecord } from '@n8n/utils/is-record';
import type { Attributes } from '@opentelemetry/api';

import { isReservedKey } from './otel.constants';

export type OtelAttributeMapper = (spanAttributes: Attributes) => Record<string, string>;

export type OtelConfigureHookApi = {
	registerResourceAttributeMapper(mapper: OtelAttributeMapper): void;
	registerOutboundBaggageMapper(mapper: OtelAttributeMapper): void;
	dangerouslyOverrideResourceAttributes(mapper: OtelAttributeMapper): void;
	dangerouslyOverrideSpanAttributes(mapper: OtelAttributeMapper): void;
};

@Service()
export class OtelConfigureHook {
	private readonly resourceAttributeMappers: OtelAttributeMapper[] = [];

	private readonly outboundBaggageMappers: OtelAttributeMapper[] = [];

	private readonly resourceAttributeOverrides: OtelAttributeMapper[] = [];

	private readonly spanAttributeOverrides: OtelAttributeMapper[] = [];

	private readonly warnedMappers = new WeakSet<OtelAttributeMapper>();

	private readonly warnedOverrideMessages = new Set<string>();

	readonly api: OtelConfigureHookApi = {
		registerResourceAttributeMapper: (mapper) => {
			this.resourceAttributeMappers.push(mapper);
		},
		registerOutboundBaggageMapper: (mapper) => {
			this.outboundBaggageMappers.push(mapper);
		},
		dangerouslyOverrideResourceAttributes: (mapper) => {
			this.resourceAttributeOverrides.push(mapper);
		},
		dangerouslyOverrideSpanAttributes: (mapper) => {
			this.spanAttributeOverrides.push(mapper);
		},
	};

	constructor(private readonly logger: Logger) {}

	clear(): void {
		this.resourceAttributeMappers.length = 0;
		this.outboundBaggageMappers.length = 0;
		this.resourceAttributeOverrides.length = 0;
		this.spanAttributeOverrides.length = 0;
	}

	mapResourceAttributes(spanAttributes: Attributes): Record<string, string> {
		return this.runMappers(this.resourceAttributeMappers, spanAttributes, 'resource attribute');
	}

	buildOutboundBaggage(spanAttributes: Attributes): Record<string, string> {
		return this.runMappers(this.outboundBaggageMappers, spanAttributes, 'outbound baggage');
	}

	overrideResourceAttributes(spanAttributes: Attributes): Record<string, string> {
		return this.runOverrides(this.resourceAttributeOverrides, spanAttributes, 'resource attribute');
	}

	overrideSpanAttributes(spanAttributes: Attributes): Record<string, string> {
		return this.runOverrides(this.spanAttributeOverrides, spanAttributes, 'span attribute');
	}

	private runOverrides(
		mappers: OtelAttributeMapper[],
		spanAttributes: Attributes,
		label: string,
	): Record<string, string> {
		const overrides = this.runMappers(mappers, spanAttributes, `${label} override`);
		for (const key of Object.keys(overrides)) {
			if (isReservedKey(key)) {
				delete overrides[key];
				this.warnOverrideOnce(
					`Ignored the ${label} "${key}" from an otel.configure override, because n8n reserves the n8n. prefix.`,
				);
			} else {
				this.warnOverrideOnce(
					`An otel.configure hook sets the ${label} "${key}" with a dangerous override.`,
				);
			}
		}
		return overrides;
	}

	private runMappers(
		mappers: OtelAttributeMapper[],
		spanAttributes: Attributes,
		label: string,
	): Record<string, string> {
		const merged: Record<string, string> = {};
		for (const mapper of mappers) {
			let result: unknown;
			try {
				result = mapper(spanAttributes);
			} catch (error) {
				this.warnOnce(mapper, label, getErrorMessage(error));
				continue;
			}
			if (result instanceof Promise) {
				void result.catch(() => {});
				this.warnOnce(mapper, label, 'An OpenTelemetry mapper must be synchronous');
				continue;
			}
			if (!isRecord(result)) continue;
			for (const [key, value] of Object.entries(result)) {
				if (typeof value === 'string') merged[key] = value;
			}
		}
		return merged;
	}

	private warnOverrideOnce(message: string): void {
		if (this.warnedOverrideMessages.has(message)) return;
		this.warnedOverrideMessages.add(message);
		this.logger.warn(message);
	}

	private warnOnce(mapper: OtelAttributeMapper, label: string, error: string): void {
		if (this.warnedMappers.has(mapper)) return;
		this.warnedMappers.add(mapper);
		this.logger.warn(`OpenTelemetry ${label} mapper failed`, { error });
	}
}
