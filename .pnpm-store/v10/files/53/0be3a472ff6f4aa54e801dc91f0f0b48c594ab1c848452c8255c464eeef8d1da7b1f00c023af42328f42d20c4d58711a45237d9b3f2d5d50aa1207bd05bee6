import { Minipass } from 'minipass';
import { Header } from './header.js';
import { Pax } from './pax.js';
import { EntryTypeName } from './types.js';
export declare class ReadEntry extends Minipass<Buffer, Buffer> {
    #private;
    extended?: Pax;
    globalExtended?: Pax;
    header: Header;
    startBlockSize: number;
    blockRemain: number;
    remain: number;
    type: EntryTypeName;
    meta: boolean;
    ignore: boolean;
    path: string;
    mode?: number;
    uid?: number;
    gid?: number;
    uname?: string;
    gname?: string;
    size: number;
    mtime?: Date;
    atime?: Date;
    ctime?: Date;
    linkpath?: string;
    dev?: number;
    ino?: number;
    nlink?: number;
    invalid: boolean;
    absolute?: string;
    unsupported: boolean;
    constructor(header: Header, ex?: Pax, gex?: Pax);
    write(data: Buffer): boolean;
}
//# sourceMappingURL=read-entry.d.ts.map