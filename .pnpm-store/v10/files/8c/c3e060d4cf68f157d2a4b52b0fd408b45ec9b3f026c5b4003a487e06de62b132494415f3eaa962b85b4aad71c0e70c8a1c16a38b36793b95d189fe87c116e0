/**
 * @file Jinja templating engine
 *
 * A minimalistic JavaScript reimplementation of the [Jinja](https://github.com/pallets/jinja) templating engine,
 * to support the chat templates. Special thanks to [Tyler Laceby](https://github.com/tlaceby) for his amazing
 * ["Guide to Interpreters"](https://github.com/tlaceby/guide-to-interpreters-series) tutorial series,
 * which provided the basis for this implementation.
 *
 * See the [Transformers documentation](https://huggingface.co/docs/transformers/main/en/chat_templating) for more information.
 *
 * @module index
 */
import { tokenize } from "./lexer";
import { parse } from "./parser";
import { Environment, Interpreter } from "./runtime";
import type { Program } from "./ast";
export declare class Template {
    parsed: Program;
    /**
     * @param {string} template The template string
     */
    constructor(template: string);
    render(items?: Record<string, unknown>): string;
    format(options?: {
        indent: string | number;
    }): string;
}
export { Environment, Interpreter, tokenize, parse };
//# sourceMappingURL=index.d.ts.map