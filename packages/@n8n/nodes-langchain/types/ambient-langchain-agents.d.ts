// Ambient module declarations to align with LangChain v0.3 API used in this package
declare module 'langchain/agents' {
	// Executor and helpers
	export class AgentExecutor {
		static fromAgentAndTools(...args: any[]): any;
		withConfig(...args: any[]): any;
		invoke(...args: any[]): Promise<any>;
	}

	export function initializeAgentExecutorWithOptions(...args: any[]): any;

	// Agent factory helpers
	export function createToolCallingAgent(...args: any[]): any;
	export function createOpenAIFunctionsAgent(...args: any[]): any;
	export const OpenAIAgent: any;

	// Agent types (treated as any for typecheck purposes)
	export type AgentAction = any;
	export type AgentFinish = any;
	export type AgentExecutorInput = any;
	export const ChatAgent: any;
	export type ChatAgent = any;
	export const ZeroShotAgent: any;
	export type ZeroShotAgent = any;
	export type AgentRunnableSequence = any;

	// Toolkit base
	export class Toolkit {
		tools: any[];
		getTools(): any[];
	}
}
