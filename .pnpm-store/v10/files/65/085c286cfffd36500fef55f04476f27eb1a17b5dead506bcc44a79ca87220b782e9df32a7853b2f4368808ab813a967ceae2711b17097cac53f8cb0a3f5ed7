import LinkifyIt = require("linkify-it");

import utils = require("./common/utils");
import helpers = require("./helpers");
import ParserBlock = require("./parser_block");
import ParserCore = require("./parser_core");
import ParserInline = require("./parser_inline");
import Renderer = require("./renderer");
import Token = require("./token");

declare namespace MarkdownIt {
    type Token = import("./token");

    /**
     * MarkdownIt provides named presets as a convenience to quickly
     * enable/disable active syntax rules and options for common use cases.
     *
     * - ["commonmark"](https://github.com/markdown-it/markdown-it/blob/master/lib/presets/commonmark.js) -
     *   configures parser to strict [CommonMark](http://commonmark.org/) mode.
     * - [default](https://github.com/markdown-it/markdown-it/blob/master/lib/presets/default.js) -
     *   similar to GFM, used when no preset name given. Enables all available rules,
     *   but still without html, typographer & autolinker.
     * - ["zero"](https://github.com/markdown-it/markdown-it/blob/master/lib/presets/zero.js) -
     *   all rules disabled. Useful to quickly setup your config via `.enable()`.
     *   For example, when you need only `bold` and `italic` markup and nothing else.
     */
    type PresetName = "default" | "zero" | "commonmark";

    interface Options {
        /**
         * Set `true` to enable HTML tags in source. Be careful!
         * That's not safe! You may need external sanitizer to protect output from XSS.
         * It's better to extend features via plugins, instead of enabling HTML.
         * @default false
         */
        html?: boolean | undefined;

        /**
         * Set `true` to add '/' when closing single tags
         * (`<br />`). This is needed only for full CommonMark compatibility. In real
         * world you will need HTML output.
         * @default false
         */
        xhtmlOut?: boolean | undefined;

        /**
         * Set `true` to convert `\n` in paragraphs into `<br>`.
         * @default false
         */
        breaks?: boolean | undefined;

        /**
         * CSS language class prefix for fenced blocks.
         * Can be useful for external highlighters.
         * @default 'language-'
         */
        langPrefix?: string | undefined;

        /**
         * Set `true` to autoconvert URL-like text to links.
         * @default false
         */
        linkify?: boolean | undefined;

        /**
         * Set `true` to enable [some language-neutral replacement](https://github.com/markdown-it/markdown-it/blob/master/lib/rules_core/replacements.js) +
         * quotes beautification (smartquotes).
         * @default false
         */
        typographer?: boolean | undefined;

        /**
         * Double + single quotes replacement
         * pairs, when typographer enabled and smartquotes on. For example, you can
         * use `'«»„“'` for Russian, `'„“‚‘'` for German, and
         * `['«\xA0', '\xA0»', '‹\xA0', '\xA0›']` for French (including nbsp).
         * @default '“”‘’'
         */
        quotes?: string | string[];

        /**
         * Highlighter function for fenced code blocks.
         * Highlighter `function (str, lang, attrs)` should return escaped HTML. It can
         * also return empty string if the source was not changed and should be escaped
         * externally. If result starts with <pre... internal wrapper is skipped.
         * @default null
         */
        highlight?: ((str: string, lang: string, attrs: string) => string) | null | undefined;
    }

    type PluginSimple = (md: MarkdownIt) => void;
    type PluginWithOptions<T = any> = (md: MarkdownIt, options?: T) => void;
    type PluginWithParams = (md: MarkdownIt, ...params: any[]) => void;
}

interface MarkdownItConstructor {
    new(): MarkdownIt;
    new(presetName: MarkdownIt.PresetName, options?: MarkdownIt.Options): MarkdownIt;
    new(options: MarkdownIt.Options): MarkdownIt;
    (): MarkdownIt;
    (presetName: MarkdownIt.PresetName, options?: MarkdownIt.Options): MarkdownIt;
    (options: MarkdownIt.Options): MarkdownIt;
}

interface MarkdownIt {
    /**
     * Instance of [[ParserInline]]. You may need it to add new rules when
     * writing plugins. For simple rules control use [[MarkdownIt.disable]] and
     * [[MarkdownIt.enable]].
     */
    readonly inline: ParserInline;

    /**
     * Instance of [[ParserBlock]]. You may need it to add new rules when
     * writing plugins. For simple rules control use [[MarkdownIt.disable]] and
     * [[MarkdownIt.enable]].
     */
    readonly block: ParserBlock;

    /**
     * Instance of [[Core]] chain executor. You may need it to add new rules when
     * writing plugins. For simple rules control use [[MarkdownIt.disable]] and
     * [[MarkdownIt.enable]].
     */
    readonly core: ParserCore;

    /**
     * Instance of [[Renderer]]. Use it to modify output look. Or to add rendering
     * rules for new token types, generated by plugins.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * function myToken(tokens, idx, options, env, self) {
     *   //...
     *   return result;
     * };
     *
     * md.renderer.rules['my_token'] = myToken
     * ```
     *
     * See [[Renderer]] docs and [source code](https://github.com/markdown-it/markdown-it/blob/master/lib/renderer.js).
     */
    readonly renderer: Renderer;

    /**
     * [linkify-it](https://github.com/markdown-it/linkify-it) instance.
     * Used by [linkify](https://github.com/markdown-it/markdown-it/blob/master/lib/rules_core/linkify.js)
     * rule.
     */
    readonly linkify: LinkifyIt.LinkifyIt;

    /**
     * Link validation function. CommonMark allows too much in links. By default
     * we disable `javascript:`, `vbscript:`, `file:` schemas, and almost all `data:...` schemas
     * except some embedded image types.
     *
     * You can change this behaviour:
     *
     * ```javascript
     * var md = require('markdown-it')();
     * // enable everything
     * md.validateLink = function () { return true; }
     * ```
     */
    validateLink(url: string): boolean;

    /**
     * Function used to encode link url to a machine-readable format,
     * which includes url-encoding, punycode, etc.
     */
    normalizeLink(url: string): string;

    /**
     * Function used to decode link url to a human-readable format`
     */
    normalizeLinkText(url: string): string;

    readonly utils: typeof utils;

    readonly helpers: typeof helpers;

    readonly options: MarkdownIt.Options;

    /**
     * *chainable*
     *
     * Set parser options (in the same format as in constructor). Probably, you
     * will never need it, but you can change options after constructor call.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')()
     *             .set({ html: true, breaks: true })
     *             .set({ typographer: true });
     * ```
     *
     * __Note:__ To achieve the best possible performance, don't modify a
     * `markdown-it` instance options on the fly. If you need multiple configurations
     * it's best to create multiple instances and initialize each with separate
     * config.
     */
    set(options: MarkdownIt.Options): this;

    /**
     * *chainable*, *internal*
     *
     * Batch load of all options and compenent settings. This is internal method,
     * and you probably will not need it. But if you with - see available presets
     * and data structure [here](https://github.com/markdown-it/markdown-it/tree/master/lib/presets)
     *
     * We strongly recommend to use presets instead of direct config loads. That
     * will give better compatibility with next versions.
     */
    configure(presets: MarkdownIt.PresetName): this;

    /**
     * *chainable*
     *
     * Enable list or rules. It will automatically find appropriate components,
     * containing rules with given names. If rule not found, and `ignoreInvalid`
     * not set - throws exception.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')()
     *             .enable(['sub', 'sup'])
     *             .disable('smartquotes');
     * ```
     *
     * @param list rule name or list of rule names to enable
     * @param ignoreInvalid set `true` to ignore errors when rule not found.
     */
    enable(list: string | string[], ignoreInvalid?: boolean): this;

    /**
     * *chainable*
     *
     * The same as [[MarkdownIt.enable]], but turn specified rules off.
     *
     * @param list rule name or list of rule names to disable.
     * @param ignoreInvalid set `true` to ignore errors when rule not found.
     */
    disable(list: string | string[], ignoreInvalid?: boolean): this;

    /**
     * *chainable*
     *
     * Load specified plugin with given params into current parser instance.
     * It's just a sugar to call `plugin(md, params)` with curring.
     *
     * ##### Example
     *
     * ```javascript
     * var iterator = require('markdown-it-for-inline');
     * var md = require('markdown-it')()
     *             .use(iterator, 'foo_replace', 'text', function (tokens, idx) {
     *               tokens[idx].content = tokens[idx].content.replace(/foo/g, 'bar');
     *             });
     * ```
     */
    use(plugin: MarkdownIt.PluginSimple): this;
    use<T = any>(plugin: MarkdownIt.PluginWithOptions<T>, options?: T): this;
    use(plugin: MarkdownIt.PluginWithParams, ...params: any[]): this;

    /**
     * *internal*
     *
     * Parse input string and returns list of block tokens (special token type
     * "inline" will contain list of inline tokens). You should not call this
     * method directly, until you write custom renderer (for example, to produce
     * AST).
     *
     * `env` is used to pass data between "distributed" rules and return additional
     * metadata like reference info, needed for the renderer. It also can be used to
     * inject data in specific cases. Usually, you will be ok to pass `{}`,
     * and then pass updated object to renderer.
     *
     * @param src source string
     * @param env environment sandbox
     */
    parse(src: string, env: any): Token[];

    /**
     * Render markdown string into html. It does all magic for you :).
     *
     * `env` can be used to inject additional metadata (`{}` by default).
     * But you will not need it with high probability. See also comment
     * in [[MarkdownIt.parse]].
     *
     * @param src source string
     * @param env environment sandbox
     */
    render(src: string, env?: any): string;

    /**
     * *internal*
     *
     * The same as [[MarkdownIt.parse]] but skip all block rules. It returns the
     * block tokens list with the single `inline` element, containing parsed inline
     * tokens in `children` property. Also updates `env` object.
     *
     * @param src source string
     * @param env environment sandbox
     */
    parseInline(src: string, env: any): Token[];

    /**
     * Similar to [[MarkdownIt.render]] but for single paragraph content. Result
     * will NOT be wrapped into `<p>` tags.
     *
     * @param src source string
     * @param env environment sandbox
     */
    renderInline(src: string, env?: any): string;
}

/**
 * Main parser/renderer class.
 *
 * ##### Usage
 *
 * ```javascript
 * // node.js, "classic" way:
 * var MarkdownIt = require('markdown-it'),
 *     md = new MarkdownIt();
 * var result = md.render('# markdown-it rulezz!');
 *
 * // node.js, the same, but with sugar:
 * var md = require('markdown-it')();
 * var result = md.render('# markdown-it rulezz!');
 *
 * // browser without AMD, added to "window" on script load
 * // Note, there are no dash.
 * var md = window.markdownit();
 * var result = md.render('# markdown-it rulezz!');
 * ```
 *
 * Single line rendering, without paragraph wrap:
 *
 * ```javascript
 * var md = require('markdown-it')();
 * var result = md.renderInline('__markdown-it__ rulezz!');
 * ```
 *
 * ##### Example
 *
 * ```javascript
 * // commonmark mode
 * var md = require('markdown-it')('commonmark');
 *
 * // default mode
 * var md = require('markdown-it')();
 *
 * // enable everything
 * var md = require('markdown-it')({
 *   html: true,
 *   linkify: true,
 *   typographer: true
 * });
 * ```
 *
 * ##### Syntax highlighting
 *
 * ```js
 * var hljs = require('highlight.js') // https://highlightjs.org/
 *
 * var md = require('markdown-it')({
 *   highlight: function (str, lang) {
 *     if (lang && hljs.getLanguage(lang)) {
 *       try {
 *         return hljs.highlight(lang, str, true).value;
 *       } catch (__) {}
 *     }
 *
 *     return ''; // use external default escaping
 *   }
 * });
 * ```
 *
 * Or with full wrapper override (if you need assign class to `<pre>`):
 *
 * ```javascript
 * var hljs = require('highlight.js') // https://highlightjs.org/
 *
 * // Actual default values
 * var md = require('markdown-it')({
 *   highlight: function (str, lang) {
 *     if (lang && hljs.getLanguage(lang)) {
 *       try {
 *         return '<pre class="hljs"><code>' +
 *                hljs.highlight(lang, str, true).value +
 *                '</code></pre>';
 *       } catch (__) {}
 *     }
 *
 *     return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
 *   }
 * });
 * ```
 */
declare const MarkdownIt: MarkdownItConstructor;

export = MarkdownIt;
