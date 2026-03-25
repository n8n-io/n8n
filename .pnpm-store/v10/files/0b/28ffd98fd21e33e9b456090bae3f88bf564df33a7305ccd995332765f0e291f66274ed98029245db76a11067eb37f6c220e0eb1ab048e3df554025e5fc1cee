/**
 * This implementation is synchronous and only implements the parts of CBOR
 * specification used by Smithy RPCv2 CBOR protocol.
 *
 * This cbor serde implementation is derived from AWS SDK for Go's implementation.
 * @see https://github.com/aws/smithy-go/tree/main/encoding/cbor
 *
 * The cbor-x implementation was also instructional:
 * @see https://github.com/kriszyp/cbor-x
 */
export declare const cbor: {
    deserialize(payload: Uint8Array): any;
    serialize(input: any): Uint8Array;
    /**
     * @public
     * @param size - byte length to allocate.
     *
     * This may be used to garbage collect the CBOR
     * shared encoding buffer space,
     * e.g. resizeEncodingBuffer(0);
     *
     * This may also be used to pre-allocate more space for
     * CBOR encoding, e.g. resizeEncodingBuffer(100_000_000);
     */
    resizeEncodingBuffer(size: number): void;
};
