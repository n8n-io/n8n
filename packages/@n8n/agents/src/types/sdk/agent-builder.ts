import type { ModelConfig } from './agent';
import type { CredentialProvider } from './credential-provider';
import type { BuiltEval } from './eval';
import type { BuiltGuardrail } from './guardrail';
import type { CheckpointStore } from './memory';
import type { BuiltProviderTool, BuiltTool } from './tool';

/**
 * Interface describing the fluent builder methods used to configure an agent.
 *
 * This exists as a standalone interface so that `fromSchema()` can accept an
 * agent to configure without importing the concrete `Agent` class (which would
 * create a circular dependency: agent.ts → from-schema.ts → agent.ts).
 *
 * The `Agent` class implements this interface.
 */
export interface AgentBuilder {
	model(providerOrIdOrConfig: string | ModelConfig, modelName?: string): this;
	credential(name: string): this;
	instructions(text: string): this;
	tool(t: BuiltTool | BuiltTool[]): this;
	providerTool(t: BuiltProviderTool): this;
	thinking(provider: string, config?: Record<string, unknown>): this;
	toolCallConcurrency(n: number): this;
	requireToolApproval(): this;
	memory(m: unknown): this;
	checkpoint(storage: 'memory' | CheckpointStore): this;
	credentialProvider(p: CredentialProvider): this;
	inputGuardrail(g: BuiltGuardrail): this;
	outputGuardrail(g: BuiltGuardrail): this;
	eval(e: BuiltEval): this;
	structuredOutput(schema: unknown): this;
	telemetry(t: unknown): this;
	mcp(client: unknown): this;
}
