import type { ITokenizer } from 'strtok3';
import { type IFileHeader, type ILocalFileHeader } from "./ZipToken.js";
export type InflateFileFilterResult = {
    handler: InflatedDataHandler | false;
    stop?: boolean;
};
export type { ILocalFileHeader } from './ZipToken.js';
/**
 * Return false when to ignore the file, return `InflatedDataHandler` to handle extracted data
 */
export type InflateFileFilter = (file: ILocalFileHeader) => InflateFileFilterResult;
export type InflatedDataHandler = (fileData: Uint8Array) => Promise<void>;
export declare class ZipHandler {
    private tokenizer;
    private syncBuffer;
    constructor(tokenizer: ITokenizer);
    isZip(): Promise<boolean>;
    private peekSignature;
    findEndOfCentralDirectoryLocator(): Promise<number>;
    readCentralDirectory(): Promise<IFileHeader[] | undefined>;
    unzip(fileCb: InflateFileFilter): Promise<void>;
    private iterateOverCentralDirectory;
    private inflate;
    private static decompressDeflateRaw;
    private readLocalFileHeader;
}
