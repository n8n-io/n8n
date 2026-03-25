import type { Decoder, Encoder, MessageHeaders } from "@smithy/types";
/**
 * @internal
 */
export declare class HeaderMarshaller {
    private readonly toUtf8;
    private readonly fromUtf8;
    constructor(toUtf8: Encoder, fromUtf8: Decoder);
    format(headers: MessageHeaders): Uint8Array;
    private formatHeaderValue;
    parse(headers: DataView): MessageHeaders;
}
