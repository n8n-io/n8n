declare namespace Ruler {
    interface RuleOptions {
        /**
         * array with names of "alternate" chains.
         */
        alt: string[];
    }
}

/**
 * class Ruler
 *
 * Helper class, used by [[MarkdownIt#core]], [[MarkdownIt#block]] and
 * [[MarkdownIt#inline]] to manage sequences of functions (rules):
 *
 * - keep rules in defined order
 * - assign the name to each rule
 * - enable/disable rules
 * - add/replace rules
 * - allow assign rules to additional named chains (in the same)
 * - cacheing lists of active rules
 *
 * You will not need use this class directly until write plugins. For simple
 * rules control use [[MarkdownIt.disable]], [[MarkdownIt.enable]] and
 * [[MarkdownIt.use]].
 */
declare class Ruler<T> {
    /**
     * Replace rule by name with new function & options. Throws error if name not
     * found.
     *
     * ##### Example
     *
     * Replace existing typographer replacement rule with new one:
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.core.ruler.at('replacements', function replace(state) {
     *   //...
     * });
     * ```
     *
     * @param name rule name to replace.
     * @param fn new rule function.
     * @param options new rule options (not mandatory).
     */
    at(name: string, fn: T, options?: Ruler.RuleOptions): void;

    /**
     * Add new rule to chain before one with given name. See also
     * [[Ruler.after]], [[Ruler.push]].
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.block.ruler.before('paragraph', 'my_rule', function replace(state) {
     *   //...
     * });
     * ```
     *
     * @param beforeName new rule will be added before this one.
     * @param ruleName name of added rule.
     * @param fn rule function.
     * @param options rule options (not mandatory).
     */
    before(beforeName: string, ruleName: string, fn: T, options?: Ruler.RuleOptions): void;

    /**
     * Add new rule to chain after one with given name. See also
     * [[Ruler.before]], [[Ruler.push]].
     *
     * ##### Options:
     *
     * - __alt__ - array with names of "alternate" chains.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.inline.ruler.after('text', 'my_rule', function replace(state) {
     *   //...
     * });
     * ```
     *
     * @param afterName new rule will be added after this one.
     * @param ruleName name of added rule.
     * @param fn rule function.
     * @param options rule options (not mandatory).
     */
    after(afterName: string, ruleName: string, fn: T, options?: Ruler.RuleOptions): void;

    /**
     * Push new rule to the end of chain. See also
     * [[Ruler.before]], [[Ruler.after]].
     *
     * ##### Options:
     *
     * - __alt__ - array with names of "alternate" chains.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.core.ruler.push('my_rule', function replace(state) {
     *   //...
     * });
     * ```
     *
     * @param ruleName name of added rule.
     * @param fn rule function.
     * @param options rule options (not mandatory).
     */
    push(ruleName: string, fn: T, options?: Ruler.RuleOptions): void;

    /**
     * Enable rules with given names. If any rule name not found - throw Error.
     * Errors can be disabled by second param.
     *
     * Returns list of found rule names (if no exception happened).
     *
     * See also [[Ruler.disable]], [[Ruler.enableOnly]].
     *
     * @param list list of rule names to enable.
     * @param ignoreInvalid set `true` to ignore errors when rule not found.
     */
    enable(list: string | string[], ignoreInvalid?: boolean): string[];

    /**
     * Enable rules with given names, and disable everything else. If any rule name
     * not found - throw Error. Errors can be disabled by second param.
     *
     * See also [[Ruler.disable]], [[Ruler.enable]].
     *
     * @param list list of rule names to enable (whitelist).
     * @param ignoreInvalid set `true` to ignore errors when rule not found.
     */
    enableOnly(list: string | string[], ignoreInvalid?: boolean): string[];

    /**
     * Disable rules with given names. If any rule name not found - throw Error.
     * Errors can be disabled by second param.
     *
     * Returns list of found rule names (if no exception happened).
     *
     * See also [[Ruler.enable]], [[Ruler.enableOnly]].
     *
     * @param list list of rule names to disable.
     * @param ignoreInvalid set `true` to ignore errors when rule not found.
     */
    disable(list: string | string[], ignoreInvalid?: boolean): string[];

    /**
     * Return array of active functions (rules) for given chain name. It analyzes
     * rules configuration, compiles caches if not exists and returns result.
     *
     * Default chain name is `''` (empty string). It can't be skipped. That's
     * done intentionally, to keep signature monomorphic for high speed.
     */
    getRules(chainName: string): T[];
}

export = Ruler;
