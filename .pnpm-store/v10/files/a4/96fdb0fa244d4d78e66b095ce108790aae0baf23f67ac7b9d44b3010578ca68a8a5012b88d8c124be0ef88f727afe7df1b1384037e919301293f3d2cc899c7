import { BetaRunnableTool, Promisable } from "../../lib/tools/BetaRunnableTool.js";
import { BetaMemoryTool20250818Command, BetaToolResultContentBlockParam } from "../../resources/beta.js";
type Command = BetaMemoryTool20250818Command['command'];
export type MemoryToolHandlers = {
    [K in Command]: (command: Extract<BetaMemoryTool20250818Command, {
        command: K;
    }>) => Promisable<string | Array<BetaToolResultContentBlockParam>>;
};
export declare function betaMemoryTool(handlers: MemoryToolHandlers): BetaRunnableTool<BetaMemoryTool20250818Command>;
export {};
//# sourceMappingURL=memory.d.ts.map