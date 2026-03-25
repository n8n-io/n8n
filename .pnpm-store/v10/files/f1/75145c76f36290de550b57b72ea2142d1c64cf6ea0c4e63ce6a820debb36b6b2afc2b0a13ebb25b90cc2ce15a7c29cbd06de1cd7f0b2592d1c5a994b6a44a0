import { BodyLengthCalculator, ChecksumConstructor, Encoder, GetAwsChunkedEncodingStream, HashConstructor, Provider, StreamCollector, StreamHasher } from "@smithy/types";
import { RequestChecksumCalculation, ResponseChecksumValidation } from "./constants";
/**
 * @internal
 */
export interface PreviouslyResolved {
    /**
     * The function that will be used to convert binary data to a base64-encoded string.
     * @internal
     */
    base64Encoder: Encoder;
    /**
     * A function that can calculate the length of a body.
     */
    bodyLengthChecker: BodyLengthCalculator;
    /**
     * A function that returns Readable Stream which follows aws-chunked encoding stream.
     */
    getAwsChunkedEncodingStream: GetAwsChunkedEncodingStream;
    /**
     * A constructor for a class implementing the {@link Hash} interface that computes MD5 hashes.
     * @internal
     */
    md5: ChecksumConstructor | HashConstructor;
    /**
     * Determines when a checksum will be calculated for request payloads
     */
    requestChecksumCalculation: Provider<RequestChecksumCalculation>;
    /**
     * Determines when a checksum will be calculated for response payloads
     */
    responseChecksumValidation: Provider<ResponseChecksumValidation>;
    /**
     * A constructor for a class implementing the {@link Hash} interface that computes SHA1 hashes.
     * @internal
     */
    sha1: ChecksumConstructor | HashConstructor;
    /**
     * A constructor for a class implementing the {@link Hash} interface that computes SHA256 hashes.
     * @internal
     */
    sha256: ChecksumConstructor | HashConstructor;
    /**
     * A function that, given a hash constructor and a stream, calculates the hash of the streamed value.
     * @internal
     */
    streamHasher: StreamHasher<any>;
    /**
     * Collects streams into buffers.
     */
    streamCollector: StreamCollector;
    /**
     * Minimum bytes from a stream to buffer into a chunk before passing to chunked encoding.
     */
    requestStreamBufferSize: number;
}
