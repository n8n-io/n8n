import { Transform, TransformOptions } from "stream";

export = Disassembler;

declare class Disassembler extends Transform {
    constructor(options?: Disassembler.DisassemblerOptions);
}

declare namespace Disassembler {
    type ReplacerFunction = (val1: any, val2: any) => any;

    type ReplaceArray = Array<string | number>;

    interface DisassemblerOptions extends TransformOptions {
        packValues?: boolean | undefined;
        packKeys?: boolean | undefined;
        packStrings?: boolean | undefined;
        packNumbers?: boolean | undefined;
        streamValues?: boolean | undefined;
        streamKeys?: boolean | undefined;
        streamStrings?: boolean | undefined;
        streamNumbers?: boolean | undefined;
        jsonStreaming?: boolean | undefined;
        replacer?: ReplacerFunction | ReplaceArray | undefined;
    }

    function make(options?: DisassemblerOptions): Disassembler;

    namespace make {
        type Constructor = Disassembler;
        const Constructor: typeof Disassembler;
    }

    function disassembler(options?: DisassemblerOptions): Disassembler;

    namespace disassembler {
        type Constructor = Disassembler;
        const Constructor: typeof Disassembler;
    }
}
