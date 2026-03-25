import type { Parser } from "./shell/Parser.js";
import type { GlobalConfig } from "./curl/opts.js";
import type { Request } from "./Request.js";
export type Warnings = [string, string][];
export declare function warnf(global_: GlobalConfig, warning: [string, string]): void;
export declare function underlineCursor(node: Parser.TreeCursor, curlCommand: string): string;
export declare function underlineNode(node: Parser.SyntaxNode, curlCommand?: string): string;
export declare function underlineNodeEnd(node: Parser.SyntaxNode, curlCommand?: string): string;
export interface Support {
    multipleUrls?: boolean;
    dataReadsFile?: boolean;
    queryReadsFile?: boolean;
    cookieFiles?: boolean;
}
export declare function warnIfPartsIgnored(request: Request, warnings: Warnings, support?: Support): void;
