import { ClientProtocol, SerdeContext, UrlParser } from "@smithy/types";
/**
 * @internal
 */
export type PreviouslyResolved = Pick<SerdeContext & {
    urlParser: UrlParser;
    protocol: ClientProtocol<any, any>;
}, Exclude<keyof (SerdeContext & {
    urlParser: UrlParser;
    protocol: ClientProtocol<any, any>;
}), "endpoint">>;
