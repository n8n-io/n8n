import {
  BodyLengthCalculator,
  ChecksumConstructor,
  Encoder,
  GetAwsChunkedEncodingStream,
  HashConstructor,
  Provider,
  StreamCollector,
  StreamHasher,
} from "@smithy/types";
import {
  RequestChecksumCalculation,
  ResponseChecksumValidation,
} from "./constants";
export interface PreviouslyResolved {
  base64Encoder: Encoder;
  bodyLengthChecker: BodyLengthCalculator;
  getAwsChunkedEncodingStream: GetAwsChunkedEncodingStream;
  md5: ChecksumConstructor | HashConstructor;
  requestChecksumCalculation: Provider<RequestChecksumCalculation>;
  responseChecksumValidation: Provider<ResponseChecksumValidation>;
  sha1: ChecksumConstructor | HashConstructor;
  sha256: ChecksumConstructor | HashConstructor;
  streamHasher: StreamHasher<any>;
  streamCollector: StreamCollector;
  requestStreamBufferSize: number;
}
