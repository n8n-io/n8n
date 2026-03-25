import type TokenProcessor from "../TokenProcessor";
import Transformer from "./Transformer";
export default class ReactHotLoaderTransformer extends Transformer {
    readonly tokens: TokenProcessor;
    readonly filePath: string;
    private extractedDefaultExportName;
    constructor(tokens: TokenProcessor, filePath: string);
    setExtractedDefaultExportName(extractedDefaultExportName: string): void;
    getPrefixCode(): string;
    getSuffixCode(): string;
    process(): boolean;
}
