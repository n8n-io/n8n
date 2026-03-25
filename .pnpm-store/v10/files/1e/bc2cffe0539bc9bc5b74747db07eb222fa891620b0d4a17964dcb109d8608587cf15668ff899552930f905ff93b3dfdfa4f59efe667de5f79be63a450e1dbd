import { type Tags } from "../types.js";
import type { TelemetryItem as Envelope } from "../generated/index.js";
import type { Resource } from "@opentelemetry/resources";
import type { Attributes, HrTime } from "@opentelemetry/api";
import type { AnyValue } from "@opentelemetry/api-logs";
export declare function hrTimeToDate(hrTime: HrTime): Date;
export declare function createTagsFromResource(resource: Resource): Tags;
export declare function isSqlDB(dbSystem: string): boolean;
export declare function getUrl(attributes: Attributes): string;
export declare function getDependencyTarget(attributes: Attributes): string;
export declare function createResourceMetricEnvelope(resource: Resource, instrumentationKey: string): Envelope | undefined;
export declare function serializeAttribute(value: AnyValue): string;
export declare function shouldCreateResourceMetric(): boolean;
export declare function isSyntheticSource(attributes: Attributes): boolean;
//# sourceMappingURL=common.d.ts.map