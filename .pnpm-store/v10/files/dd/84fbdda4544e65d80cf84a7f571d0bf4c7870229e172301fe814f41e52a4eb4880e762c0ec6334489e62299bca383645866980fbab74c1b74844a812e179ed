type Encoding = 'utf-8' | 'CP437' | 'CP850' | 'CP874' | 'CP932' | 'CP936' | 'CP949' | 'CP950' | 'CP1250' | 'CP1251' | 'CP1252' | 'CP1253' | 'CP1254' | 'CP1255' | 'CP1256' | 'CP1257' | 'CP1258';
export declare const codepageByLanguageId: {
    [key: number]: Encoding;
};
export declare const codepageBySortId: {
    [key: number]: Encoding;
};
export declare const Flags: {
    IGNORE_CASE: number;
    IGNORE_ACCENT: number;
    IGNORE_KANA: number;
    IGNORE_WIDTH: number;
    BINARY: number;
    BINARY2: number;
    UTF8: number;
};
export declare class Collation {
    readonly lcid: number;
    readonly flags: number;
    readonly version: number;
    readonly sortId: number;
    readonly codepage: Encoding | undefined;
    private buffer;
    static fromBuffer(buffer: Buffer, offset?: number): Collation;
    constructor(lcid: number, flags: number, version: number, sortId: number);
    toBuffer(): Buffer;
}
export {};
