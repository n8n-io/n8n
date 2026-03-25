import { BaseChain } from "./base.js";
import { ChainValues } from "../libs/langchain-core/dist/utils/types/index.js";
import { LoadValues } from "../util/load.js";

//#region src/chains/load.d.ts

/**
 * Load a chain from {@link https://github.com/hwchase17/langchain-hub | LangchainHub} or local filesystem.
 *
 * @example
 * Loading from LangchainHub:
 * ```ts
 * import { loadChain } from "@langchain/classic/chains/load";
 * const chain = await loadChain("lc://chains/hello-world/chain.json");
 * const res = await chain.call({ topic: "my favorite color" });
 * ```
 *
 * @example
 * Loading from local filesystem:
 * ```ts
 * import { loadChain } from "@langchain/classic/chains/load";
 * const chain = await loadChain("/path/to/chain.json");
 * ```
 */
declare const loadChain: (uri: string, values?: LoadValues) => Promise<BaseChain<ChainValues, ChainValues>>;
//#endregion
export { loadChain };
//# sourceMappingURL=load.d.ts.map