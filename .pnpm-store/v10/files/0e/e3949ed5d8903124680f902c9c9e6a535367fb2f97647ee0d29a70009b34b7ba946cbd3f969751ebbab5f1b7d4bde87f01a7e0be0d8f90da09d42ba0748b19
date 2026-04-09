import type {
  OnFinishEvent,
  OnStartEvent,
  OnStepFinishEvent,
  OnStepStartEvent,
  OnToolCallFinishEvent,
  OnToolCallStartEvent,
} from '../generate-text/callback-events';
import type { Output } from '../generate-text/output';
import type { ToolSet } from '../generate-text/tool-set';
import { Listener } from '../util/notify';

/**
 * Implement this interface to create custom telemetry integrations.
 * Methods can be sync or return a PromiseLike.
 */
export interface TelemetryIntegration {
  onStart?: Listener<OnStartEvent<ToolSet, Output>>;
  onStepStart?: Listener<OnStepStartEvent<ToolSet, Output>>;
  onToolCallStart?: Listener<OnToolCallStartEvent<ToolSet>>;
  onToolCallFinish?: Listener<OnToolCallFinishEvent<ToolSet>>;
  onStepFinish?: Listener<OnStepFinishEvent<ToolSet>>;
  onFinish?: Listener<OnFinishEvent<ToolSet>>;
}
