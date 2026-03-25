import type { NormalizedSchema } from "@smithy/core/schema";
import type { CodecSettings, TimestampDateTimeSchema, TimestampEpochSecondsSchema, TimestampHttpDateSchema } from "@smithy/types";
/**
 * Assuming the schema is a timestamp type, the function resolves the format using
 * either the timestamp's own traits, or the default timestamp format from the CodecSettings.
 *
 * @internal
 */
export declare function determineTimestampFormat(ns: NormalizedSchema, settings: CodecSettings): TimestampDateTimeSchema | TimestampHttpDateSchema | TimestampEpochSecondsSchema;
