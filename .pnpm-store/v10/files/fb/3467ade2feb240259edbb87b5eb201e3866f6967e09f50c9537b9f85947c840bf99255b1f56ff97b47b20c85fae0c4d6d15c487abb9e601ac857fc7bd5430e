import { BetaToolResultContentBlockParam, BetaToolUnion } from "../../resources/beta.js";
export type Promisable<T> = T | Promise<T>;
export type BetaRunnableTool<Input = any> = BetaToolUnion & {
    run: (args: Input) => Promisable<string | Array<BetaToolResultContentBlockParam>>;
    parse: (content: unknown) => Input;
};
//# sourceMappingURL=BetaRunnableTool.d.ts.map