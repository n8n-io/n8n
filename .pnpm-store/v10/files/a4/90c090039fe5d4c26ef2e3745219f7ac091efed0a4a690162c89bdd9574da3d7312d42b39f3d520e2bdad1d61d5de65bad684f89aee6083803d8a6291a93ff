const require_config = require("./config.cjs");
const require_utils_stream = require("../utils/stream.cjs");
const require_base = require("./base.cjs");
//#region src/runnables/branch.ts
/**
* Class that represents a runnable branch. The RunnableBranch is
* initialized with an array of branches and a default branch. When invoked,
* it evaluates the condition of each branch in order and executes the
* corresponding branch if the condition is true. If none of the conditions
* are true, it executes the default branch.
* @example
* ```typescript
* const branch = RunnableBranch.from([
*   [
*     (x: { topic: string; question: string }) =>
*       x.topic.toLowerCase().includes("anthropic"),
*     anthropicChain,
*   ],
*   [
*     (x: { topic: string; question: string }) =>
*       x.topic.toLowerCase().includes("langchain"),
*     langChainChain,
*   ],
*   generalChain,
* ]);
*
* const fullChain = RunnableSequence.from([
*   {
*     topic: classificationChain,
*     question: (input: { question: string }) => input.question,
*   },
*   branch,
* ]);
*
* const result = await fullChain.invoke({
*   question: "how do I use LangChain?",
* });
* ```
*/
var RunnableBranch = class extends require_base.Runnable {
	static lc_name() {
		return "RunnableBranch";
	}
	lc_namespace = ["langchain_core", "runnables"];
	lc_serializable = true;
	default;
	branches;
	constructor(fields) {
		super(fields);
		this.branches = fields.branches;
		this.default = fields.default;
	}
	/**
	* Convenience method for instantiating a RunnableBranch from
	* RunnableLikes (objects, functions, or Runnables).
	*
	* Each item in the input except for the last one should be a
	* tuple with two items. The first is a "condition" RunnableLike that
	* returns "true" if the second RunnableLike in the tuple should run.
	*
	* The final item in the input should be a RunnableLike that acts as a
	* default branch if no other branches match.
	*
	* @example
	* ```ts
	* import { RunnableBranch } from "@langchain/core/runnables";
	*
	* const branch = RunnableBranch.from([
	*   [(x: number) => x > 0, (x: number) => x + 1],
	*   [(x: number) => x < 0, (x: number) => x - 1],
	*   (x: number) => x
	* ]);
	* ```
	* @param branches An array where the every item except the last is a tuple of [condition, runnable]
	*   pairs. The last item is a default runnable which is invoked if no other condition matches.
	* @returns A new RunnableBranch.
	*/
	static from(branches) {
		if (branches.length < 1) throw new Error("RunnableBranch requires at least one branch");
		const coercedBranches = branches.slice(0, -1).map(([condition, runnable]) => [require_base._coerceToRunnable(condition), require_base._coerceToRunnable(runnable)]);
		const defaultBranch = require_base._coerceToRunnable(branches[branches.length - 1]);
		return new this({
			branches: coercedBranches,
			default: defaultBranch
		});
	}
	async _invoke(input, config, runManager) {
		let result;
		for (let i = 0; i < this.branches.length; i += 1) {
			const [condition, branchRunnable] = this.branches[i];
			if (await condition.invoke(input, require_config.patchConfig(config, { callbacks: runManager?.getChild(`condition:${i + 1}`) }))) {
				result = await branchRunnable.invoke(input, require_config.patchConfig(config, { callbacks: runManager?.getChild(`branch:${i + 1}`) }));
				break;
			}
		}
		if (!result) result = await this.default.invoke(input, require_config.patchConfig(config, { callbacks: runManager?.getChild("branch:default") }));
		return result;
	}
	async invoke(input, config = {}) {
		return this._callWithConfig(this._invoke, input, config);
	}
	async *_streamIterator(input, config) {
		const runManager = await (await require_config.getCallbackManagerForConfig(config))?.handleChainStart(this.toJSON(), require_base._coerceToDict(input, "input"), config?.runId, void 0, void 0, void 0, config?.runName);
		let finalOutput;
		let finalOutputSupported = true;
		let stream;
		try {
			for (let i = 0; i < this.branches.length; i += 1) {
				const [condition, branchRunnable] = this.branches[i];
				if (await condition.invoke(input, require_config.patchConfig(config, { callbacks: runManager?.getChild(`condition:${i + 1}`) }))) {
					stream = await branchRunnable.stream(input, require_config.patchConfig(config, { callbacks: runManager?.getChild(`branch:${i + 1}`) }));
					for await (const chunk of stream) {
						yield chunk;
						if (finalOutputSupported) if (finalOutput === void 0) finalOutput = chunk;
						else try {
							finalOutput = require_utils_stream.concat(finalOutput, chunk);
						} catch {
							finalOutput = void 0;
							finalOutputSupported = false;
						}
					}
					break;
				}
			}
			if (stream === void 0) {
				stream = await this.default.stream(input, require_config.patchConfig(config, { callbacks: runManager?.getChild("branch:default") }));
				for await (const chunk of stream) {
					yield chunk;
					if (finalOutputSupported) if (finalOutput === void 0) finalOutput = chunk;
					else try {
						finalOutput = require_utils_stream.concat(finalOutput, chunk);
					} catch {
						finalOutput = void 0;
						finalOutputSupported = false;
					}
				}
			}
		} catch (e) {
			await runManager?.handleChainError(e);
			throw e;
		}
		await runManager?.handleChainEnd(finalOutput ?? {});
	}
};
//#endregion
exports.RunnableBranch = RunnableBranch;

//# sourceMappingURL=branch.cjs.map