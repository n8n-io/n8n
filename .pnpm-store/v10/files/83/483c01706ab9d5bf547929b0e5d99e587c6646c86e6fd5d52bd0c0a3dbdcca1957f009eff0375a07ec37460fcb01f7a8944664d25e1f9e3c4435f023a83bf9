import MarkdownIt = require(".");
import Token = require("./token");

declare namespace Renderer {
    type RenderRule = (tokens: Token[], idx: number, options: MarkdownIt.Options, env: any, self: Renderer) => string;

    interface RenderRuleRecord {
        [type: string]: RenderRule | undefined;
        code_inline?: RenderRule | undefined;
        code_block?: RenderRule | undefined;
        fence?: RenderRule | undefined;
        image?: RenderRule | undefined;
        hardbreak?: RenderRule | undefined;
        softbreak?: RenderRule | undefined;
        text?: RenderRule | undefined;
        html_block?: RenderRule | undefined;
        html_inline?: RenderRule | undefined;
    }
}

declare class Renderer {
    /**
     * Contains render rules for tokens. Can be updated and extended.
     *
     * ##### Example
     *
     * ```javascript
     * var md = require('markdown-it')();
     *
     * md.renderer.rules.strong_open  = function () { return '<b>'; };
     * md.renderer.rules.strong_close = function () { return '</b>'; };
     *
     * var result = md.renderInline(...);
     * ```
     *
     * Each rule is called as independent static function with fixed signature:
     *
     * ```javascript
     * function my_token_render(tokens, idx, options, env, renderer) {
     *   // ...
     *   return renderedHTML;
     * }
     * ```
     *
     * See [source code](https://github.com/markdown-it/markdown-it/blob/master/lib/renderer.js)
     * for more details and examples.
     */
    rules: Renderer.RenderRuleRecord;

    /**
     * Render token attributes to string.
     */
    renderAttrs(token: Token): string;

    /**
     * Default token renderer. Can be overriden by custom function
     * in [[Renderer#rules]].
     *
     * @param tokens list of tokens
     * @param idx token index to render
     * @param options params of parser instance
     */
    renderToken(tokens: Token[], idx: number, options: MarkdownIt.Options): string;

    /**
     * The same as [[Renderer.render]], but for single token of `inline` type.
     *
     * @param tokens list on block tokens to renter
     * @param options params of parser instance
     * @param env additional data from parsed input (references, for example)
     */
    renderInline(tokens: Token[], options: MarkdownIt.Options, env: any): string;

    /**
     * Special kludge for image `alt` attributes to conform CommonMark spec.
     * Don't try to use it! Spec requires to show `alt` content with stripped markup,
     * instead of simple escaping.
     *
     * @param tokens list on block tokens to renter
     * @param options params of parser instance
     * @param env additional data from parsed input (references, for example)
     */
    renderInlineAsText(tokens: Token[], options: MarkdownIt.Options, env: any): string;

    /**
     * Takes token stream and generates HTML. Probably, you will never need to call
     * this method directly.
     *
     * @param tokens list on block tokens to renter
     * @param options params of parser instance
     * @param env additional data from parsed input (references, for example)
     */
    render(tokens: Token[], options: MarkdownIt.Options, env: any): string;
}

export = Renderer;
