import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { isRecord } from '@n8n/utils/is-record';
import type { Attributes } from '@opentelemetry/api';

export type OtelAttributeMapper = (spanAttributes: Attributes) => Record<string, string>;

export type OtelConfigureHookApi = {
	registerResourceAttributeMapper(mapper: OtelAttributeMapper): void;
	registerOutboundBaggageMapper(mapper: OtelAttributeMapper): void;
};

@Service()
export class OtelConfigureHook {
	private readonly resourceAttributeMappers: OtelAttributeMapper[] = [];

	private readonly outboundBaggageMappers: OtelAttributeMapper[] = [];

	private readonly warnedMappers = new WeakSet<OtelAttributeMapper>();

	readonly api: OtelConfigureHookApi = {
		registerResourceAttributeMapper: (mapper) => {
			this.resourceAttributeMappers.push(mapper);
		},
		registerOutboundBaggageMapper: (mapper) => {
			this.outboundBaggageMappers.push(mapper);
		},
	};

	constructor(private readonly logger: Logger) {}

	mapResourceAttributes(spanAttributes: Attributes): Record<string, string> {
		return this.runMappers(this.resourceAttributeMappers, spanAttributes, 'resource attribute');
	}

	buildOutboundBaggage(spanAttributes: Attributes): Record<string, string> {
		return this.runMappers(this.outboundBaggageMappers, spanAttributes, 'outbound baggage');
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

	private warnOnce(mapper: OtelAttributeMapper, label: string, error: string): void {
		if (this.warnedMappers.has(mapper)) return;
		this.warnedMappers.add(mapper);
		this.logger.warn(`OpenTelemetry ${label} mapper failed`, { error });
	}
}
