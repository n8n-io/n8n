import type { ClientProtocol, SerdeContext, UrlParser } from "@smithy/types";
/**
 * @internal
 */
export type PreviouslyResolved = Omit<SerdeContext & {
    urlParser: UrlParser;
    protocol: ClientProtocol<any, any>;
}, "endpoint">;
