import { SerdeContext } from "@smithy/core/protocols";
import { Codec, Schema, ShapeDeserializer, ShapeSerializer } from "@smithy/types";
/**
 * @public
 */
export declare class CborCodec extends SerdeContext implements Codec<Uint8Array, Uint8Array> {
    createSerializer(): CborShapeSerializer;
    createDeserializer(): CborShapeDeserializer;
}
/**
 * @public
 */
export declare class CborShapeSerializer extends SerdeContext implements ShapeSerializer {
    private value;
    write(schema: Schema, value: unknown): void;
    /**
     * Recursive serializer transform that copies and prepares the user input object
     * for CBOR serialization.
     */
    serialize(schema: Schema, source: unknown): any;
    flush(): Uint8Array;
}
/**
 * @public
 */
export declare class CborShapeDeserializer extends SerdeContext implements ShapeDeserializer {
    read(schema: Schema, bytes: Uint8Array): any;
    /**
     * Public because it's called by the protocol implementation to deserialize errors.
     * @internal
     */
    readValue(_schema: Schema, value: any): any;
}
