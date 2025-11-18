import type { CompiledGraph } from '@langchain/langgraph';

export interface ISubgraph<TConfig = any, TInput = any, TOutput = any> {
	name: string;
	description: string;
	create(config: TConfig): CompiledGraph<any, any, any, any, any, any>;
	inputSchema?: any;
	outputSchema?: any;
	transformInput?: (parentState: any) => TInput;
	transformOutput?: (subgraphOutput: TOutput, parentState: any) => Partial<typeof parentState>;
}

export abstract class BaseSubgraph<TConfig = any, TInput = any, TOutput = any>
	implements ISubgraph<TConfig, TInput, TOutput>
{
	abstract name: string;
	abstract description: string;

	abstract create(config: TConfig): CompiledGraph<any, any, any, any, any, any>;
}
