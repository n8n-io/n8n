import { HeaderData } from './header.js';
export declare class Pax implements HeaderData {
    atime?: Date;
    mtime?: Date;
    ctime?: Date;
    charset?: string;
    comment?: string;
    gid?: number;
    uid?: number;
    gname?: string;
    uname?: string;
    linkpath?: string;
    dev?: number;
    ino?: number;
    nlink?: number;
    path?: string;
    size?: number;
    mode?: number;
    global: boolean;
    constructor(obj: HeaderData, global?: boolean);
    encode(): Buffer<ArrayBuffer>;
    encodeBody(): string;
    encodeField(field: keyof Pax): string;
    static parse(str: string, ex?: HeaderData, g?: boolean): Pax;
}
//# sourceMappingURL=pax.d.ts.map