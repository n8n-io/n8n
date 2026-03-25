export interface OutputBuffer {
    push: (text: string) => void;
    unshift: (text: string) => void;
    remove: (start: number, end?: number) => void;
    insertAt: (index: number, text: string) => void;
    length: () => number;
    flush: () => void;
    stripLastOccurrence: (textToStrip: string, stripRemainingText?: boolean) => void;
    insertBeforeLastWhitespace: (textToInsert: string) => void;
    endsWithIgnoringWhitespace: (char: string) => boolean;
}
export interface OutputBufferOptions {
    write: (chunk: string) => void;
    chunkSize: number;
    bufferSize: number;
}
export declare function createOutputBuffer({ write, chunkSize, bufferSize }: OutputBufferOptions): OutputBuffer;
//# sourceMappingURL=OutputBuffer.d.ts.map