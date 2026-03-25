import {Value} from './index';

/**
 * Sass's [function type](https://sass-lang.com/documentation/values/functions).
 *
 * **Heads up!** Although first-class Sass functions can be processed by custom
 * functions, there's no way to invoke them outside of a Sass stylesheet.
 *
 * @category Custom Function
 */
export class SassFunction extends Value {
  /**
   * Creates a new first-class function that can be invoked using
   * [`meta.call()`](https://sass-lang.com/documentation/modules/meta#call).
   *
   * @param signature - The function signature, like you'd write for the
   * [`@function rule`](https://sass-lang.com/documentation/at-rules/function).
   * @param callback - The callback that's invoked when this function is called,
   * just like for a {@link CustomFunction}.
   */
  constructor(signature: string, callback: (args: Value[]) => Value);
}
