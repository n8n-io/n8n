import { EventEmitter } from "node:events";
import type { File, FileJSON } from "./index";

declare class VolatileFile extends EventEmitter {
    constructor(properties: File);
    open(): void;
    toJSON(): FileJSON;
    toString(): string;
    write(buffer: string, cb: () => void): void;
    end(cb: () => void): void;
    destroy(): void;
}

export = VolatileFile;
