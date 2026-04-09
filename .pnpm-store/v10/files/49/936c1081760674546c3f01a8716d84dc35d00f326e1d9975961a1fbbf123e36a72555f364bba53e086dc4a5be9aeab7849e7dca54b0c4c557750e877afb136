import { AttributeValue, Tracer } from '@opentelemetry/api';
import type { TelemetryIntegration } from './telemetry-integration';

/**
 * Telemetry configuration.
 */
// This is meant to be both flexible for custom app requirements (metadata)
// and extensible for standardization (example: functionId, more to come).
export type TelemetrySettings = {
  /**
   * Enable or disable telemetry. Disabled by default while experimental.
   */
  isEnabled?: boolean;

  /**
   * Enable or disable input recording. Enabled by default.
   *
   * You might want to disable input recording to avoid recording sensitive
   * information, to reduce data transfers, or to increase performance.
   */
  recordInputs?: boolean;

  /**
   * Enable or disable output recording. Enabled by default.
   *
   * You might want to disable output recording to avoid recording sensitive
   * information, to reduce data transfers, or to increase performance.
   */
  recordOutputs?: boolean;

  /**
   * Identifier for this function. Used to group telemetry data by function.
   */
  functionId?: string;

  /**
   * Additional information to include in the telemetry data.
   */
  metadata?: Record<string, AttributeValue>;

  /**
   * A custom tracer to use for the telemetry data.
   */
  tracer?: Tracer;

  /**
   * Per-call telemetry integrations that receive lifecycle events during generation.
   *
   * These integrations run after any globally registered integrations
   * (see `registerTelemetryIntegration`).
   */
  integrations?: TelemetryIntegration | TelemetryIntegration[];
};
