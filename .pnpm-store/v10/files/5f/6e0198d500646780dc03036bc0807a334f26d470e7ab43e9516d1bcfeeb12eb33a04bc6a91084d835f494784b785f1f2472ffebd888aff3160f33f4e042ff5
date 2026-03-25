import * as grpc from '@grpc/grpc-js';
import {Metadata} from 'nice-grpc-common';

/** @internal */
export function convertMetadataToGrpcJs(metadata: Metadata): grpc.Metadata {
  const grpcMetadata = new grpc.Metadata();

  for (const [key, values] of metadata) {
    for (const value of values) {
      grpcMetadata.add(
        key,
        typeof value === 'string' ? value : Buffer.from(value),
      );
    }
  }

  return grpcMetadata;
}

/** @internal */
export function convertMetadataFromGrpcJs(
  grpcMetadata: grpc.Metadata,
): Metadata {
  const metadata = Metadata();

  for (const key of Object.keys(grpcMetadata.getMap())) {
    const value = grpcMetadata.get(key);

    metadata.set(key, value);
  }

  return metadata;
}
