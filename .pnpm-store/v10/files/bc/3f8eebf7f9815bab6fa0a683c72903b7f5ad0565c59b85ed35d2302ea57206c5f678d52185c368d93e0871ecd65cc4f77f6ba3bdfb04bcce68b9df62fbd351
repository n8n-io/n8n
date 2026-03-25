import { Buffer } from 'buffer';
import { Minipass } from 'minipass';
import * as realZlib from 'zlib';
export { constants } from './constants.js';
declare const _superWrite: unique symbol;
export declare class ZlibError extends Error {
    code?: string;
    errno?: number;
    constructor(err: NodeJS.ErrnoException | Error, origin?: Function);
    get name(): string;
}
declare const _flushFlag: unique symbol;
export type ChunkWithFlushFlag = Minipass.ContiguousData & {
    [_flushFlag]?: number;
};
export type ZlibBaseOptions = Minipass.Options<Minipass.ContiguousData> & {
    flush?: number;
    finishFlush?: number;
    fullFlushFlag?: number;
};
export type ZlibHandle = realZlib.Gzip | realZlib.Gunzip | realZlib.Deflate | realZlib.Inflate | realZlib.DeflateRaw | realZlib.InflateRaw | realZlib.BrotliCompress | realZlib.BrotliDecompress | realZlib.ZstdCompress | realZlib.ZstdDecompress;
export type ZlibMode = 'Gzip' | 'Gunzip' | 'Deflate' | 'Inflate' | 'DeflateRaw' | 'InflateRaw' | 'Unzip';
export type BrotliMode = 'BrotliCompress' | 'BrotliDecompress';
export type ZstdMode = 'ZstdCompress' | 'ZstdDecompress';
declare abstract class ZlibBase extends Minipass<Buffer, ChunkWithFlushFlag> {
    #private;
    get sawError(): boolean;
    get handle(): ZlibHandle | undefined;
    get flushFlag(): number;
    constructor(opts: ZlibBaseOptions, mode: ZlibMode | BrotliMode | ZstdMode);
    close(): void;
    reset(): any;
    flush(flushFlag?: number): void;
    end(cb?: () => void): this;
    end(chunk: ChunkWithFlushFlag, cb?: () => void): this;
    end(chunk: ChunkWithFlushFlag, encoding?: Minipass.Encoding, cb?: () => void): this;
    get ended(): boolean;
    [_superWrite](data: Buffer & {
        [_flushFlag]?: number;
    }): boolean;
    write(chunk: ChunkWithFlushFlag, cb?: () => void): boolean;
    write(chunk: ChunkWithFlushFlag, encoding?: Minipass.Encoding, cb?: () => void): boolean;
}
export type ZlibOptions = ZlibBaseOptions & {
    level?: number;
    strategy?: number;
};
export declare class Zlib extends ZlibBase {
    #private;
    constructor(opts: ZlibOptions, mode: ZlibMode);
    params(level: number, strategy: number): void;
}
export declare class Deflate extends Zlib {
    constructor(opts: ZlibOptions);
}
export declare class Inflate extends Zlib {
    constructor(opts: ZlibOptions);
}
export type GzipOptions = ZlibOptions & {
    portable?: boolean;
};
export declare class Gzip extends Zlib {
    #private;
    constructor(opts: GzipOptions);
    [_superWrite](data: Buffer & {
        [_flushFlag]?: number;
    }): boolean;
}
export declare class Gunzip extends Zlib {
    constructor(opts: ZlibOptions);
}
export declare class DeflateRaw extends Zlib {
    constructor(opts: ZlibOptions);
}
export declare class InflateRaw extends Zlib {
    constructor(opts: ZlibOptions);
}
export declare class Unzip extends Zlib {
    constructor(opts: ZlibOptions);
}
declare class Brotli extends ZlibBase {
    constructor(opts: ZlibOptions, mode: BrotliMode);
}
export declare class BrotliCompress extends Brotli {
    constructor(opts: ZlibOptions);
}
export declare class BrotliDecompress extends Brotli {
    constructor(opts: ZlibOptions);
}
declare class Zstd extends ZlibBase {
    constructor(opts: ZlibOptions, mode: ZstdMode);
}
export declare class ZstdCompress extends Zstd {
    constructor(opts: ZlibOptions);
}
export declare class ZstdDecompress extends Zstd {
    constructor(opts: ZlibOptions);
}
//# sourceMappingURL=index.d.ts.map