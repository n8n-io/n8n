import { collectBody } from "@smithy/core/protocols";
import { HttpRequest as __HttpRequest } from "@smithy/protocol-http";
import { calculateBodyLength } from "@smithy/util-body-length-browser";
import { cbor } from "./cbor";
import { tag, tagSymbol } from "./cbor-types";
export const parseCborBody = (streamBody, context) => {
    return collectBody(streamBody, context).then(async (bytes) => {
        if (bytes.length) {
            try {
                return cbor.deserialize(bytes);
            }
            catch (e) {
                Object.defineProperty(e, "$responseBodyText", {
                    value: context.utf8Encoder(bytes),
                });
                throw e;
            }
        }
        return {};
    });
};
export const dateToTag = (date) => {
    return tag({
        tag: 1,
        value: date.getTime() / 1000,
    });
};
export const parseCborErrorBody = async (errorBody, context) => {
    const value = await parseCborBody(errorBody, context);
    value.message = value.message ?? value.Message;
    return value;
};
export const loadSmithyRpcV2CborErrorCode = (output, data) => {
    const sanitizeErrorCode = (rawValue) => {
        let cleanValue = rawValue;
        if (typeof cleanValue === "number") {
            cleanValue = cleanValue.toString();
        }
        if (cleanValue.indexOf(",") >= 0) {
            cleanValue = cleanValue.split(",")[0];
        }
        if (cleanValue.indexOf(":") >= 0) {
            cleanValue = cleanValue.split(":")[0];
        }
        if (cleanValue.indexOf("#") >= 0) {
            cleanValue = cleanValue.split("#")[1];
        }
        return cleanValue;
    };
    if (data["__type"] !== undefined) {
        return sanitizeErrorCode(data["__type"]);
    }
    if (data.code !== undefined) {
        return sanitizeErrorCode(data.code);
    }
};
export const checkCborResponse = (response) => {
    if (String(response.headers["smithy-protocol"]).toLowerCase() !== "rpc-v2-cbor") {
        throw new Error("Malformed RPCv2 CBOR response, status: " + response.statusCode);
    }
};
export const buildHttpRpcRequest = async (context, headers, path, resolvedHostname, body) => {
    const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
    const contents = {
        protocol,
        hostname,
        port,
        method: "POST",
        path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
        headers: {
            ...headers,
        },
    };
    if (resolvedHostname !== undefined) {
        contents.hostname = resolvedHostname;
    }
    if (body !== undefined) {
        contents.body = body;
        try {
            contents.headers["content-length"] = String(calculateBodyLength(body));
        }
        catch (e) { }
    }
    return new __HttpRequest(contents);
};
