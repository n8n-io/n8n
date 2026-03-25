import type * as ts from 'typescript';
export interface ISourceFileLocationFormatOptions {
    sourceFileLine?: number;
    sourceFileColumn?: number;
    workingPackageFolderPath?: string;
}
export declare class SourceFileLocationFormatter {
    /**
     * Returns a string such as this, based on the context information in the provided node:
     *   "[C:\Folder\File.ts#123]"
     */
    static formatDeclaration(node: ts.Node, workingPackageFolderPath?: string): string;
    static formatPath(sourceFilePath: string, options?: ISourceFileLocationFormatOptions): string;
}
//# sourceMappingURL=SourceFileLocationFormatter.d.ts.map