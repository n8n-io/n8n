import { fstatSync, lstatSync, ReadStream } from "node:fs";
export const calculateBodyLength = (body) => {
    if (!body) {
        return 0;
    }
    if (typeof body === "string") {
        return Buffer.byteLength(body);
    }
    else if (typeof body.byteLength === "number") {
        return body.byteLength;
    }
    else if (typeof body.size === "number") {
        return body.size;
    }
    else if (typeof body.start === "number" && typeof body.end === "number") {
        return body.end + 1 - body.start;
    }
    else if (body instanceof ReadStream) {
        if (body.path != null) {
            return lstatSync(body.path).size;
        }
        else if (typeof body.fd === "number") {
            return fstatSync(body.fd).size;
        }
    }
    throw new Error(`Body Length computation failed for ${body}`);
};
