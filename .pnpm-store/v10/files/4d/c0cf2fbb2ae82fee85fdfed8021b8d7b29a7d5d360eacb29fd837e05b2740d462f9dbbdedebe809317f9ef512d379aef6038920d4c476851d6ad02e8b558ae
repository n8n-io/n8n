import { EventEmitter } from "events";
import { File, FileJSON } from "./";

declare class PersistentFile extends EventEmitter {
    constructor(properties: File);
    open(): void;
    toJSON(): FileJSON;
    toString(): string;
    write(buffer: string, cb: () => void): void;
    end(cb: () => void): void;
    destroy(): void;
}

export = PersistentFile;
