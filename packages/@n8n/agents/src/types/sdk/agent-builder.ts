import type { ExecutionOptions, ModelConfig } from './agent';
import type { BuiltEval } from './eval';
import type { BuiltGuardrail } from './guardrail';
import type { CheckpointStore } from './memory';
import type { BuiltProviderTool, BuiltTool } from './tool';
import type { ScopedMemoryTaskEvent } from '../../runtime/memory/scoped-memory-task-runner';
import type { RuntimeSkill, RuntimeSkillSource } from '../../skills';

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
	instructions(text: string): this;
	tool(t: BuiltTool | BuiltTool[]): this;
	deferredTool(t: BuiltTool | BuiltTool[], options?: { search?: { topK?: number } }): this;
	skills(sourceOrSkills: RuntimeSkillSource | RuntimeSkill[]): this;
	providerTool(t: BuiltProviderTool): this;
	thinking(provider: string, config?: Record<string, unknown>): this;
	toolCallConcurrency(n: number): this;
	memory(m: unknown): this;
	memoryTaskObserver(observer: (event: ScopedMemoryTaskEvent) => void): this;
	checkpoint(storage: 'memory' | CheckpointStore): this;
	inputGuardrail(g: BuiltGuardrail): this;
	outputGuardrail(g: BuiltGuardrail): this;
	eval(e: BuiltEval): this;
	structuredOutput(schema: unknown): this;
	telemetry(t: unknown): this;
	mcp(client: unknown): this;
	configuration(options: ExecutionOptions): this;
}
