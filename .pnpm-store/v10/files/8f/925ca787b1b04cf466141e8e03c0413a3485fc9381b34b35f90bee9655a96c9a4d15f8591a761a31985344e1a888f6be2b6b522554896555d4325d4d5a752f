import type { Linter } from './Linter';
export declare namespace Processor {
    interface ProcessorMeta {
        /**
         * The unique name of the processor.
         */
        name: string;
        /**
         * The a string identifying the version of the processor.
         */
        version?: string;
    }
    type PreProcess = (text: string, filename: string) => (string | {
        text: string;
        filename: string;
    })[];
    type PostProcess = (messagesList: Linter.LintMessage[][], filename: string) => Linter.LintMessage[];
    interface ProcessorModule {
        /**
         * Information about the processor to uniquely identify it when serializing.
         */
        meta?: ProcessorMeta;
        /**
         * The function to extract code blocks.
         */
        preprocess?: PreProcess;
        /**
         * The function to merge messages.
         */
        postprocess?: PostProcess;
        /**
         * If `true` then it means the processor supports autofix.
         */
        supportsAutofix?: boolean;
    }
}
//# sourceMappingURL=Processor.d.ts.map