import { Provider } from "@smithy/types";
import { RequestChecksumCalculation, ResponseChecksumValidation } from "./constants";
/**
 * @public
 */
export interface FlexibleChecksumsInputConfig {
    /**
     * Determines when a checksum will be calculated for request payloads.
     */
    requestChecksumCalculation?: RequestChecksumCalculation | Provider<RequestChecksumCalculation>;
    /**
     * Determines when checksum validation will be performed on response payloads.
     */
    responseChecksumValidation?: ResponseChecksumValidation | Provider<ResponseChecksumValidation>;
    /**
     * Default 0 (off).
     *
     * When set to a value greater than or equal to 8192, sets the minimum number
     * of bytes to buffer into a chunk when processing input streams
     * with chunked encoding (that is, when request checksums are enabled).
     * A minimum of 8kb = 8 * 1024 is required, and 64kb or higher is recommended.
     *
     * See https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-streaming.html.
     *
     * This has a slight performance penalty because it must wrap and buffer
     * your input stream.
     * You do not need to set this value if your stream already flows chunks
     * of 8kb or greater.
     */
    requestStreamBufferSize?: number | false;
}
/**
 * @internal
 */
export interface FlexibleChecksumsResolvedConfig {
    requestChecksumCalculation: Provider<RequestChecksumCalculation>;
    responseChecksumValidation: Provider<ResponseChecksumValidation>;
    requestStreamBufferSize: number;
}
/**
 * @internal
 */
export declare const resolveFlexibleChecksumsConfig: <T>(input: T & FlexibleChecksumsInputConfig) => T & FlexibleChecksumsResolvedConfig;
