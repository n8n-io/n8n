type StateRecord = Record<string, unknown>;

interface InvokeConfig {
	recursionLimit?: number;
}

export interface ISubgraph<
	TConfig = unknown,
	TChildState extends StateRecord = StateRecord,
	TParentState extends StateRecord = StateRecord,
> {
	name: string;
	description: string;
	create(config: TConfig): {
		invoke: (input: Partial<TChildState>, config?: InvokeConfig) => Promise<TChildState>;
	};
	transformInput: (parentState: TParentState) => Partial<TChildState>;
	transformOutput: (childOutput: TChildState, parentState: TParentState) => Partial<TParentState>;
}

export abstract class BaseSubgraph<
	TConfig = unknown,
	TChildState extends StateRecord = StateRecord,
	TParentState extends StateRecord = StateRecord,
> implements ISubgraph<TConfig, TChildState, TParentState>
{
	abstract name: string;
	abstract description: string;

	abstract create(config: TConfig): {
		invoke: (input: Partial<TChildState>, config?: InvokeConfig) => Promise<TChildState>;
	};

	/**
	 * Transform parent state to subgraph input state
	 * Returns a partial object with only the fields needed to initialize the child state
	 */
	abstract transformInput(parentState: TParentState): Partial<TChildState>;

	/**
	 * Transform subgraph output state to parent state update
	 * Returns a partial object that will be merged into the parent state
	 */
	abstract transformOutput(
		childOutput: TChildState,
		parentState: TParentState,
	): Partial<TParentState>;
}
