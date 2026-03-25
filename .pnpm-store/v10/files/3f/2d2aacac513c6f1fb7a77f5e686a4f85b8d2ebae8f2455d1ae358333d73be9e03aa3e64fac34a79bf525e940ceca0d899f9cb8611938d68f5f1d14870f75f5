import { Transform, TransformOptions } from "stream";

export = JsonlStringer;

declare class JsonlStringer extends Transform {
    constructor(options?: JsonlStringer.JsonlStringerOptions);
}

declare namespace JsonlStringer {
    interface JsonlStringerOptions extends TransformOptions {
        replacer?: ((this: any, key: string, value: any) => any) | undefined;
    }

    function make(options?: JsonlStringerOptions): JsonlStringer;

    namespace make {
        type Constructor = JsonlStringer;
        const Constructor: typeof JsonlStringer;
    }

    function stringer(options?: JsonlStringerOptions): JsonlStringer;

    namespace stringer {
        type Constructor = JsonlStringer;
        const Constructor: typeof JsonlStringer;
    }
}
