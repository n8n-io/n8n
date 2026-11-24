import { Time } from '@n8n/constants';

import { Config, Env } from '../decorators';

@Config
export class AiConfig {
	/** Whether AI features (such as AI nodes and AI assistant) are enabled globally. */
	@Env('N8N_AI_ENABLED')
	enabled: boolean = false;

	/**
	 * Maximum time in milliseconds to wait for an HTTP response from an AI service.
	 * Matches the maximum workflow execution timeout, EXECUTIONS_TIMEOUT_MAX (1 hour) so AI calls do not outlive executions.
	 * Default: 1 hour.
	 */
	@Env('N8N_AI_TIMEOUT_MAX')
	timeout: number = 1 * Time.hours.toMilliseconds;

	/**
	 * Whether workflow and node parameter values may be sent to AI providers.
	 * When false, only structure or placeholders are sent.
	 */
	@Env('N8N_AI_ALLOW_SENDING_PARAMETER_VALUES')
	allowSendingParameterValues: boolean = true;

	/**
	 * Maximum size in bytes of a single binary file (e.g. an image or PDF) that the
	 * AI Agent node will pass through to a model. Files above this are rejected
	 * before the request is sent. Default: 50 MB.
	 */
	@Env('N8N_AI_AGENT_MAX_PASSTHROUGH_BINARY_SIZE_BYTES')
	maxAgentPassthroughBinarySizeBytes: number = 50 * 1024 * 1024;

	/**
	 * Max milliseconds of silence on an AI agent model stream once the turn has
	 * started producing output, before the turn fails with a stall error. Raise
	 * this when a proxy or gateway in front of the model buffers responses. Set
	 * to 0 to disable stall detection entirely. Unset uses the agent runtime's
	 * default (90 seconds).
	 */
	@Env('N8N_AI_MODEL_STREAM_IDLE_TIMEOUT_MS')
	modelStreamIdleTimeoutMs?: number;

	/**
	 * Max milliseconds of silence before an AI agent model stream's first output
	 * chunk. Longer than the idle timeout by design: large uncached prompts spend
	 * minutes in prompt processing before the provider sends anything. The agent
	 * runtime clamps it to at least the idle timeout, so 0 cannot disable it —
	 * non-positive values are ignored. Unset uses the agent runtime's default
	 * (3 minutes). That clamp also applies to the default: an idle timeout above
	 * 3 minutes raises the effective first-output deadline to match it.
	 */
	@Env('N8N_AI_MODEL_STREAM_FIRST_OUTPUT_TIMEOUT_MS')
	modelStreamFirstOutputTimeoutMs?: number;

	get openAiDefaultHeaders(): Record<string, string> {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		return { 'openai-platform': 'org-qkmJQuJ2WnvoIKMr2UJwIJkZ' };
	}
}
