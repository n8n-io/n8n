import {
	type StructuredToolInterface,
	type ToolInterface,
	ToolInputParsingException,
	Tool,
} from '@langchain/core/tools';
import { Runnable, type RunnableConfig, patchConfig } from '@langchain/core/runnables';
import { AgentAction, AgentFinish, AgentStep } from '@langchain/core/agents';
import { ChainValues } from '@langchain/core/utils/types';
import {
	CallbackManager,
	CallbackManagerForChainRun,
	Callbacks,
} from '@langchain/core/callbacks/manager';
import { OutputParserException } from '@langchain/core/output_parsers';
import { Serializable } from '@langchain/core/load/serializable';
import { SerializedLLMChain } from 'langchain/dist/chains/serde';
import { StoppingMethod } from 'langchain/dist/agents/types';
import {
	AgentRunnableSequence,
	BaseMultiActionAgent,
	BaseSingleActionAgent,
	RunnableMultiActionAgent,
	RunnableSingleActionAgent,
	isRunnableAgent,
} from 'langchain/dist/agents/agent';
import { BaseChain, ChainInputs } from 'langchain/dist/chains/base';

interface AgentExecutorIteratorInput {
	agentExecutor: AgentExecutor;
	inputs: Record<string, string>;
	config?: RunnableConfig;
	/** @deprecated Use "config" */
	callbacks?: Callbacks;
	/** @deprecated Use "config" */
	tags?: string[];
	/** @deprecated Use "config" */
	metadata?: Record<string, unknown>;
	runName?: string;
	runManager?: CallbackManagerForChainRun;
}

export class AgentExecutorIterator extends Serializable implements AgentExecutorIteratorInput {
	lc_namespace = ['langchain', 'agents', 'executor_iterator'];

	agentExecutor: AgentExecutor;

	inputs: Record<string, string>;

	config?: RunnableConfig;

	/** @deprecated Use "config" */
	callbacks?: Callbacks;

	/** @deprecated Use "config" */
	tags: string[] | undefined;

	/** @deprecated Use "config" */
	metadata: Record<string, unknown> | undefined;

	/** @deprecated Use "config" */
	runName: string | undefined;

	private _finalOutputs: Record<string, unknown> | undefined;

	get finalOutputs(): Record<string, unknown> | undefined {
		return this._finalOutputs;
	}

	/** Intended to be used as a setter method, needs to be async. */
	async setFinalOutputs(value: Record<string, unknown> | undefined) {
		this._finalOutputs = undefined;
		if (value) {
			const preparedOutputs: Record<string, unknown> = await this.agentExecutor.prepOutputs(
				this.inputs,
				value,
				true,
			);
			this._finalOutputs = preparedOutputs;
		}
	}

	runManager: CallbackManagerForChainRun | undefined;

	intermediateSteps: AgentStep[] = [];

	iterations = 0;

	get nameToToolMap(): Record<string, ToolInterface> {
		const toolMap = this.agentExecutor.tools.map((tool) => ({
			[tool.name]: tool,
		}));
		return Object.assign({}, ...toolMap);
	}

	constructor(fields: AgentExecutorIteratorInput) {
		super(fields);
		this.agentExecutor = fields.agentExecutor;
		this.inputs = fields.inputs;
		this.callbacks = fields.callbacks;
		this.tags = fields.tags;
		this.metadata = fields.metadata;
		this.runName = fields.runName;
		this.runManager = fields.runManager;
		this.config = fields.config;
	}

	/**
	 * Reset the iterator to its initial state, clearing intermediate steps,
	 * iterations, and the final output.
	 */
	reset(): void {
		this.intermediateSteps = [];
		this.iterations = 0;
		this._finalOutputs = undefined;
	}

	updateIterations(): void {
		this.iterations += 1;
	}

	async *streamIterator() {
		this.reset();

		// Loop to handle iteration
		while (true) {
			try {
				if (this.iterations === 0) {
					await this.onFirstStep();
				}

				const result = await this._callNext();
				yield result;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (e: any) {
				if ('message' in e && e.message.startsWith('Final outputs already reached: ')) {
					if (!this.finalOutputs) {
						throw e;
					}
					return this.finalOutputs;
				}
				if (this.runManager) {
					await this.runManager.handleChainError(e);
				}
				throw e;
			}
		}
	}

	/**
	 * Perform any necessary setup for the first step
	 * of the asynchronous iterator.
	 */
	async onFirstStep(): Promise<void> {
		if (this.iterations === 0) {
			const callbackManager = await CallbackManager.configure(
				this.callbacks ?? this.config?.callbacks,
				this.agentExecutor.callbacks,
				this.tags ?? this.config?.tags,
				this.agentExecutor.tags,
				this.metadata ?? this.config?.metadata,
				this.agentExecutor.metadata,
				{
					verbose: this.agentExecutor.verbose,
				},
			);
			this.runManager = await callbackManager?.handleChainStart(
				this.agentExecutor.toJSON(),
				this.inputs,
				this.config?.runId,
				undefined,
				this.tags ?? this.config?.tags,
				this.metadata ?? this.config?.metadata,
				this.runName ?? this.config?.runName,
			);
			if (this.config !== undefined) {
				delete this.config.runId;
			}
		}
	}

	/**
	 * Execute the next step in the chain using the
	 * AgentExecutor's _takeNextStep method.
	 */
	async _executeNextStep(
		runManager?: CallbackManagerForChainRun,
	): Promise<AgentFinish | AgentStep[]> {
		return this.agentExecutor._takeNextStep(
			this.nameToToolMap,
			this.inputs,
			this.intermediateSteps,
			runManager,
			this.config,
		);
	}

	/**
	 * Process the output of the next step,
	 * handling AgentFinish and tool return cases.
	 */
	async _processNextStepOutput(
		nextStepOutput: AgentFinish | AgentStep[],
		runManager?: CallbackManagerForChainRun,
	): Promise<Record<string, string | AgentStep[]>> {
		if ('returnValues' in nextStepOutput) {
			const output = await this.agentExecutor._return(
				nextStepOutput as AgentFinish,
				this.intermediateSteps,
				runManager,
			);
			if (this.runManager) {
				await this.runManager.handleChainEnd(output);
			}
			await this.setFinalOutputs(output);
			return output;
		}

		this.intermediateSteps = this.intermediateSteps.concat(nextStepOutput as AgentStep[]);

		let output: Record<string, string | AgentStep[]> = {};
		if (Array.isArray(nextStepOutput) && nextStepOutput.length === 1) {
			const nextStep = nextStepOutput[0];
			const toolReturn = await this.agentExecutor._getToolReturn(nextStep);
			if (toolReturn) {
				output = await this.agentExecutor._return(toolReturn, this.intermediateSteps, runManager);
				await this.runManager?.handleChainEnd(output);
				await this.setFinalOutputs(output);
			}
		}
		output = { intermediateSteps: nextStepOutput as AgentStep[] };
		return output;
	}

	async _stop(): Promise<Record<string, unknown>> {
		const output = await this.agentExecutor.agent.returnStoppedResponse(
			this.agentExecutor.earlyStoppingMethod,
			this.intermediateSteps,
			this.inputs,
		);
		const returnedOutput = await this.agentExecutor._return(
			output,
			this.intermediateSteps,
			this.runManager,
		);
		await this.setFinalOutputs(returnedOutput);
		await this.runManager?.handleChainEnd(returnedOutput);
		return returnedOutput;
	}

	async _callNext(): Promise<Record<string, unknown>> {
		// final output already reached: stopiteration (final output)
		if (this.finalOutputs) {
			throw new Error(
				`Final outputs already reached: ${JSON.stringify(this.finalOutputs, null, 2)}`,
			);
		}
		// timeout/max iterations: stopiteration (stopped response)
		if (!this.agentExecutor.shouldContinueGetter(this.iterations)) {
			return this._stop();
		}
		const nextStepOutput = await this._executeNextStep(this.runManager);
		const output = await this._processNextStepOutput(nextStepOutput, this.runManager);
		this.updateIterations();
		return output;
	}
}

type ExtractToolType<T> = T extends { ToolType: infer ToolInterface }
	? ToolInterface
	: StructuredToolInterface;

/**
 * Interface defining the structure of input data for creating an
 * AgentExecutor. It extends ChainInputs and includes additional
 * properties specific to agent execution.
 */
export interface AgentExecutorInput extends ChainInputs {
	agent:
		| BaseSingleActionAgent
		| BaseMultiActionAgent
		| Runnable<ChainValues & { steps?: AgentStep[] }, AgentAction[] | AgentAction | AgentFinish>;
	tools: ExtractToolType<this['agent']>[];
	returnIntermediateSteps?: boolean;
	maxIterations?: number;
	earlyStoppingMethod?: StoppingMethod;
	handleParsingErrors?:
		| boolean
		| string
		| ((e: OutputParserException | ToolInputParsingException) => string);
	handleToolRuntimeErrors?: (e: Error) => string;
}

// TODO: Type properly with { intermediateSteps?: AgentStep[] };
export type AgentExecutorOutput = ChainValues;

/**
 * Tool that just returns the query.
 * Used for exception tracking.
 */
export class ExceptionTool extends Tool {
	name = '_Exception';

	description = 'Exception tool';

	async _call(query: string) {
		return query;
	}
}

/**
 * A chain managing an agent using tools.
 * @augments BaseChain
 * @example
 * ```typescript
 *
 * const executor = AgentExecutor.fromAgentAndTools({
 *   agent: async () => loadAgentFromLangchainHub(),
 *   tools: [new SerpAPI(), new Calculator()],
 *   returnIntermediateSteps: true,
 * });
 *
 * const result = await executor.invoke({
 *   input: `Who is Olivia Wilde's boyfriend? What is his current age raised to the 0.23 power?`,
 * });
 *
 * ```
 */
export class AgentExecutor extends BaseChain<ChainValues, AgentExecutorOutput> {
	static lc_name() {
		return 'AgentExecutor';
	}

	get lc_namespace() {
		return ['langchain', 'agents', 'executor'];
	}

	agent: BaseSingleActionAgent | BaseMultiActionAgent;

	tools: this['agent']['ToolType'][];

	returnIntermediateSteps = false;

	maxIterations?: number = 15;

	earlyStoppingMethod: StoppingMethod = 'force';

	// TODO: Update BaseChain implementation on breaking change to include this
	returnOnlyOutputs = true;

	/**
   * How to handle errors raised by the agent's output parser.
    Defaults to `False`, which raises the error.

    If `true`, the error will be sent back to the LLM as an observation.
    If a string, the string itself will be sent to the LLM as an observation.
    If a callable function, the function will be called with the exception
    as an argument, and the result of that function will be passed to the agent
    as an observation.
   */
	handleParsingErrors:
		| boolean
		| string
		| ((e: OutputParserException | ToolInputParsingException) => string) = false;

	handleToolRuntimeErrors?: (e: Error) => string;

	get inputKeys() {
		return this.agent.inputKeys;
	}

	get outputKeys() {
		return this.agent.returnValues;
	}

	constructor(input: AgentExecutorInput) {
		let agent: BaseSingleActionAgent | BaseMultiActionAgent;
		let returnOnlyOutputs = true;
		if (Runnable.isRunnable(input.agent)) {
			if (AgentRunnableSequence.isAgentRunnableSequence(input.agent)) {
				if (input.agent.singleAction) {
					agent = new RunnableSingleActionAgent({
						runnable: input.agent,
						streamRunnable: input.agent.streamRunnable,
					});
				} else {
					agent = new RunnableMultiActionAgent({
						runnable: input.agent,
						streamRunnable: input.agent.streamRunnable,
					});
				}
			} else {
				agent = new RunnableMultiActionAgent({ runnable: input.agent });
			}
			// TODO: Update BaseChain implementation on breaking change
			returnOnlyOutputs = false;
		} else {
			if (isRunnableAgent(input.agent)) {
				returnOnlyOutputs = false;
			}
			agent = input.agent;
		}

		super(input);
		this.agent = agent;
		this.tools = input.tools;
		this.handleParsingErrors = input.handleParsingErrors ?? this.handleParsingErrors;
		this.handleToolRuntimeErrors = input.handleToolRuntimeErrors;
		this.returnOnlyOutputs = returnOnlyOutputs;
		if (this.agent._agentActionType() === 'multi') {
			for (const tool of this.tools) {
				if (tool.returnDirect) {
					throw new Error(
						`Tool with return direct ${tool.name} not supported for multi-action agent.`,
					);
				}
			}
		}
		this.returnIntermediateSteps = input.returnIntermediateSteps ?? this.returnIntermediateSteps;
		this.maxIterations = input.maxIterations ?? this.maxIterations;
		this.earlyStoppingMethod = input.earlyStoppingMethod ?? this.earlyStoppingMethod;
	}

	/** Create from agent and a list of tools. */
	static fromAgentAndTools(fields: AgentExecutorInput): AgentExecutor {
		return new AgentExecutor(fields);
	}

	get shouldContinueGetter() {
		return this.shouldContinue.bind(this);
	}

	/**
	 * Method that checks if the agent execution should continue based on the
	 * number of iterations.
	 * @param iterations The current number of iterations.
	 * @returns A boolean indicating whether the agent execution should continue.
	 */
	private shouldContinue(iterations: number): boolean {
		return this.maxIterations === undefined || iterations < this.maxIterations;
	}

	/** @ignore */
	async _call(
		inputs: ChainValues,
		runManager?: CallbackManagerForChainRun,
		config?: RunnableConfig,
	): Promise<AgentExecutorOutput> {
		const toolsByName = Object.fromEntries(this.tools.map((t) => [t.name.toLowerCase(), t]));
		const steps: AgentStep[] = [];
		let iterations = 0;

		const getOutput = async (finishStep: AgentFinish): Promise<AgentExecutorOutput> => {
			const { returnValues } = finishStep;
			const additional = await this.agent.prepareForOutput(returnValues, steps);

			await runManager?.handleAgentEnd(finishStep);

			let response;

			if (this.returnIntermediateSteps) {
				response = { ...returnValues, intermediateSteps: steps, ...additional };
			} else {
				response = { ...returnValues, ...additional };
			}
			if (!this.returnOnlyOutputs) {
				response = { ...inputs, ...response };
			}
			return response;
		};

		while (this.shouldContinue(iterations)) {
			let output;
			try {
				output = await this.agent.plan(steps, inputs, runManager?.getChild(), config);
			} catch (e) {
				// eslint-disable-next-line no-instanceof/no-instanceof
				if (e instanceof OutputParserException) {
					let observation;
					let text = e.message;
					if (this.handleParsingErrors === true) {
						if (e.sendToLLM) {
							observation = e.observation;
							text = e.llmOutput ?? '';
						} else {
							observation = 'Invalid or incomplete response';
						}
					} else if (typeof this.handleParsingErrors === 'string') {
						observation = this.handleParsingErrors;
					} else if (typeof this.handleParsingErrors === 'function') {
						observation = this.handleParsingErrors(e);
					} else {
						throw e;
					}
					output = {
						tool: '_Exception',
						toolInput: observation,
						log: text,
					} as AgentAction;
				} else {
					throw e;
				}
			}
			// Check if the agent has finished
			if ('returnValues' in output) {
				return getOutput(output);
			}

			let actions: AgentAction[];
			if (Array.isArray(output)) {
				actions = output as AgentAction[];
			} else {
				actions = [output as AgentAction];
			}

			const newSteps = await Promise.all(
				actions.map(async (action) => {
					await runManager?.handleAgentAction(action);
					const tool =
						action.tool === '_Exception'
							? new ExceptionTool()
							: toolsByName[action.tool?.toLowerCase()];
					let observation;
					try {
						observation = tool
							? await tool.invoke(
									action.toolInput,
									patchConfig(config, { callbacks: runManager?.getChild() }),
								)
							: `${action.tool} is not a valid tool, try another one.`;
						if (typeof observation !== 'string') {
							throw new Error('Received unsupported non-string response from tool call.');
						}
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
					} catch (e: any) {
						// eslint-disable-next-line no-instanceof/no-instanceof
						if (e instanceof ToolInputParsingException) {
							if (this.handleParsingErrors === true) {
								observation = 'Invalid or incomplete tool input. Please try again.';
							} else if (typeof this.handleParsingErrors === 'string') {
								observation = this.handleParsingErrors;
							} else if (typeof this.handleParsingErrors === 'function') {
								observation = this.handleParsingErrors(e);
							} else {
								throw e;
							}
							observation = await new ExceptionTool().call(observation, runManager?.getChild());
							return { action, observation: observation ?? '' };
						} else if (this.handleToolRuntimeErrors !== undefined) {
							observation = this.handleToolRuntimeErrors(e);
						}
					}

					return { action, observation: observation ?? '' };
				}),
			);

			steps.push(...newSteps);

			const lastStep = steps[steps.length - 1];
			const lastTool = toolsByName[lastStep.action.tool?.toLowerCase()];

			if (lastTool?.returnDirect) {
				return getOutput({
					returnValues: { [this.agent.returnValues[0]]: lastStep.observation },
					log: '',
				});
			}

			iterations += 1;
		}

		const finish = await this.agent.returnStoppedResponse(this.earlyStoppingMethod, steps, inputs);

		return getOutput(finish);
	}

	async _takeNextStep(
		nameToolMap: Record<string, ToolInterface>,
		inputs: ChainValues,
		intermediateSteps: AgentStep[],
		runManager?: CallbackManagerForChainRun,
		config?: RunnableConfig,
	): Promise<AgentFinish | AgentStep[]> {
		let output;
		try {
			output = await this.agent.plan(intermediateSteps, inputs, runManager?.getChild(), config);
		} catch (e) {
			// eslint-disable-next-line no-instanceof/no-instanceof
			if (e instanceof OutputParserException) {
				let observation;
				let text = e.message;
				if (this.handleParsingErrors === true) {
					if (e.sendToLLM) {
						observation = e.observation;
						text = e.llmOutput ?? '';
					} else {
						observation = 'Invalid or incomplete response';
					}
				} else if (typeof this.handleParsingErrors === 'string') {
					observation = this.handleParsingErrors;
				} else if (typeof this.handleParsingErrors === 'function') {
					observation = this.handleParsingErrors(e);
				} else {
					throw e;
				}
				output = {
					tool: '_Exception',
					toolInput: observation,
					log: text,
				} as AgentAction;
			} else {
				throw e;
			}
		}

		if ('returnValues' in output) {
			return output;
		}

		let actions: AgentAction[];
		if (Array.isArray(output)) {
			actions = output as AgentAction[];
		} else {
			actions = [output as AgentAction];
		}

		const result: AgentStep[] = [];
		for (const agentAction of actions) {
			let observation = '';
			if (runManager) {
				await runManager?.handleAgentAction(agentAction);
			}
			if (agentAction.tool in nameToolMap) {
				const tool = nameToolMap[agentAction.tool];
				try {
					observation = await tool.call(agentAction.toolInput, runManager?.getChild());
					if (typeof observation !== 'string') {
						throw new Error('Received unsupported non-string response from tool call.');
					}
				} catch (e) {
					// eslint-disable-next-line no-instanceof/no-instanceof
					if (e instanceof ToolInputParsingException) {
						if (this.handleParsingErrors === true) {
							observation = 'Invalid or incomplete tool input. Please try again.';
						} else if (typeof this.handleParsingErrors === 'string') {
							observation = this.handleParsingErrors;
						} else if (typeof this.handleParsingErrors === 'function') {
							observation = this.handleParsingErrors(e);
						} else {
							throw e;
						}
						observation = await new ExceptionTool().call(observation, runManager?.getChild());
					}
				}
			} else {
				observation = `${
					agentAction.tool
				} is not a valid tool, try another available tool: ${Object.keys(nameToolMap).join(', ')}`;
			}
			result.push({
				action: agentAction,
				observation,
			});
		}
		return result;
	}

	async _return(
		output: AgentFinish,
		intermediateSteps: AgentStep[],
		runManager?: CallbackManagerForChainRun,
	): Promise<AgentExecutorOutput> {
		if (runManager) {
			await runManager.handleAgentEnd(output);
		}
		const finalOutput: Record<string, unknown> = output.returnValues;
		if (this.returnIntermediateSteps) {
			finalOutput.intermediateSteps = intermediateSteps;
		}
		return finalOutput;
	}

	async _getToolReturn(nextStepOutput: AgentStep): Promise<AgentFinish | null> {
		const { action, observation } = nextStepOutput;
		const nameToolMap = Object.fromEntries(this.tools.map((t) => [t.name.toLowerCase(), t]));
		const [returnValueKey = 'output'] = this.agent.returnValues;
		// Invalid tools won't be in the map, so we return False.
		if (action.tool in nameToolMap) {
			if (nameToolMap[action.tool].returnDirect) {
				return {
					returnValues: { [returnValueKey]: observation },
					log: '',
				};
			}
		}
		return null;
	}

	_returnStoppedResponse(earlyStoppingMethod: StoppingMethod) {
		if (earlyStoppingMethod === 'force') {
			return {
				returnValues: {
					output: 'Agent stopped due to iteration limit or time limit.',
				},
				log: '',
			} as AgentFinish;
		}
		throw new Error(`Got unsupported early_stopping_method: ${earlyStoppingMethod}`);
	}

	async *_streamIterator(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		inputs: Record<string, any>,
		options?: Partial<RunnableConfig>,
	): AsyncGenerator<ChainValues> {
		const agentExecutorIterator = new AgentExecutorIterator({
			inputs,
			agentExecutor: this,
			config: options,
			// TODO: Deprecate these other parameters
			metadata: options?.metadata,
			tags: options?.tags,
			callbacks: options?.callbacks,
		});
		const iterator = agentExecutorIterator.streamIterator();
		for await (const step of iterator) {
			if (!step) {
				continue;
			}
			yield step;
		}
	}

	_chainType() {
		return 'agent_executor' as const;
	}

	serialize(): SerializedLLMChain {
		throw new Error('Cannot serialize an AgentExecutor');
	}
}
