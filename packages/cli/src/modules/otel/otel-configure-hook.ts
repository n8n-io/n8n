import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { isRecord } from '@n8n/utils/is-record';
import type { Attributes } from '@opentelemetry/api';
import { UserError } from 'n8n-workflow';

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

	get hasResourceAttributeMappers(): boolean {
		return this.resourceAttributeMappers.length > 0;
	}

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
			try {
				const result: unknown = mapper(spanAttributes);
				if (result instanceof Promise) {
					void result.catch(() => {});
					throw new UserError('An OpenTelemetry mapper must be synchronous');
				}
				if (!isRecord(result)) continue;
				for (const [key, value] of Object.entries(result)) {
					if (typeof value === 'string') merged[key] = value;
				}
			} catch (error) {
				if (this.warnedMappers.has(mapper)) continue;
				this.warnedMappers.add(mapper);
				this.logger.warn(`OpenTelemetry ${label} mapper failed`, { error: getErrorMessage(error) });
			}
		}
		return merged;
	}
}
