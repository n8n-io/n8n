import type { Parser, Handler } from "./Parser";
/**
 * Calls a specific handler function for all events that are encountered.
 *
 * @param func — The function to multiplex all events to.
 */
export default class MultiplexHandler implements Handler {
    _func: (event: keyof Handler, ...args: unknown[]) => void;
    constructor(func: (event: keyof Handler, ...args: unknown[]) => void);
    onattribute(name: string, value: string, quote: string | null | undefined): void;
    oncdatastart(): void;
    oncdataend(): void;
    ontext(text: string): void;
    onprocessinginstruction(name: string, value: string): void;
    oncomment(comment: string): void;
    oncommentend(): void;
    onclosetag(name: string): void;
    onopentag(name: string, attribs: {
        [key: string]: string;
    }): void;
    onopentagname(name: string): void;
    onerror(error: Error): void;
    onend(): void;
    onparserinit(parser: Parser): void;
    onreset(): void;
}
//# sourceMappingURL=MultiplexHandler.d.ts.map