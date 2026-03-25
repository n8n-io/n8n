import { Blob } from "buffer";
import { ReadStream } from "fs";
import Response = require("./node/response");
import { CBHandler } from "../types";

type BrowserParser = (str: string) => any;

type MultipartValueSingle = Blob | Buffer | ReadStream | string | boolean | number;

type MultipartValue = MultipartValueSingle | MultipartValueSingle[];

type NodeParser = (res: Response, callback: (err: Error | null, body: any) => void) => void;

type Parser = BrowserParser | NodeParser;

type Serializer = (obj: any) => string;

declare class RequestBase extends Promise<Response> {
    abort(): this;
    clearTimeout(): this;
    field(fields: { [fieldName: string]: MultipartValue }): this;
    field(name: string, val: MultipartValue): this;
    get(header: string): string;
    getHeader(header: string): string;
    maxResponseSize(n: number): this;
    ok(callback: (res: Response) => boolean): this;
    parse(parser: Parser): this;
    redirects(n: number): this;
    responseType(type: string): this;
    retry(count?: number, callback?: CBHandler): this;
    send(data?: string | object): this;
    serialize(serializer: Serializer): this;
    set(field: Record<string, string>): this;
    set(field: string, val: string): this;
    sortQuery(sort?: boolean | ((a: string, b: string) => number)): this;
    timeout(ms: number | { deadline?: number | undefined; response?: number | undefined }): this;
    toJSON(): {
        method: string;
        url: string;
        data?: string | object;
        headers: Array<string | string[]>;
    };
    unset(field: string): this;
    use(fn: (req: this) => void): this;
    withCredentials(on?: boolean): this;
}

export = RequestBase;
