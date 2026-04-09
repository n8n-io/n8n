import type { Disposable, LanguageServiceEnvironment } from '@volar/language-service';
import type * as ts from 'typescript';
import { URI } from 'vscode-uri';
export declare function createSys(sys: ts.System | undefined, env: Pick<LanguageServiceEnvironment, 'onDidChangeWatchedFiles' | 'fs'>, getCurrentDirectory: () => string, uriConverter: {
    asUri(fileName: string): URI;
    asFileName(uri: URI): string;
}): ts.System & {
    version: number;
    sync(): Promise<number>;
} & Disposable;
