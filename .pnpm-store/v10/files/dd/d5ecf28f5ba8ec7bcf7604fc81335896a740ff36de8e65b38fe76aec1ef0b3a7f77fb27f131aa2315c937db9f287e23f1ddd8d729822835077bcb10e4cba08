import { Match } from './types/Match.cjs';
import * as symbols from './internals/symbols.cjs';
/**
 * `match` creates a **pattern matching expression**.
 *  * Use `.with(pattern, handler)` to pattern match on the input.
 *  * Use `.exhaustive()` or `.otherwise(() => defaultValue)` to end the expression and get the result.
 *
 * [Read the documentation for `match` on GitHub](https://github.com/gvergnaud/ts-pattern#match)
 *
 * @example
 *  declare let input: "A" | "B";
 *
 *  return match(input)
 *    .with("A", () => "It's an A!")
 *    .with("B", () => "It's a B!")
 *    .exhaustive();
 *
 */
export declare function match<const input, output = symbols.unset>(value: input): Match<input, output>;
