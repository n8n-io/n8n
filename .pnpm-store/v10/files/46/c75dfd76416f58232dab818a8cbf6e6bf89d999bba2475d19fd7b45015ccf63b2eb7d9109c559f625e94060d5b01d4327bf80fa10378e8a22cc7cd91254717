import { BetaToolResultContentBlockParam, BetaToolUnion } from '../../resources/beta';

export type Promisable<T> = T | Promise<T>;

// this type is just an extension of BetaTool with a run and parse method
// that will be called by `toolRunner()` helpers
export type BetaRunnableTool<Input = any> = BetaToolUnion & {
  run: (args: Input) => Promisable<string | Array<BetaToolResultContentBlockParam>>;
  parse: (content: unknown) => Input;
};
