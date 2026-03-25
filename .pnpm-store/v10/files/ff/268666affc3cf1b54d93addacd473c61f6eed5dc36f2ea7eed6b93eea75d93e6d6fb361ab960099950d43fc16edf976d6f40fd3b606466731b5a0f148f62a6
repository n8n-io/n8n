import {ServerSurfaceCall} from '@grpc/grpc-js/build/src/server-call';
import {CallContext, Metadata} from 'nice-grpc-common';
import {
  convertMetadataFromGrpcJs,
  convertMetadataToGrpcJs,
} from '../utils/convertMetadata';

// https://github.com/deeplay-io/nice-grpc/issues/607
// https://github.com/deeplay-io/nice-grpc/issues/555
export type CallContextMaybeCancel = {
  signal: AbortSignal;
  cancel?: () => void;
};

/** @internal */
export function createCallContext(call: ServerSurfaceCall): {
  context: CallContext;
  maybeCancel: CallContextMaybeCancel;
} {
  const ac = new AbortController();
  const maybeCancel: CallContextMaybeCancel = {
    signal: ac.signal,
    cancel() {
      ac.abort();
    },
  };

  const header = Metadata();
  const trailer = Metadata();

  if (call.cancelled) {
    maybeCancel.cancel?.();
    maybeCancel.cancel = undefined;
  } else {
    call.on('close', () => {
      maybeCancel.cancel = undefined;
    });
    call.on('finish', () => {
      maybeCancel.cancel = undefined;
    });
    call.on('cancelled', () => {
      maybeCancel.cancel?.();
      maybeCancel.cancel = undefined;
    });
  }

  let headerSent = false;

  const context = {
    metadata: convertMetadataFromGrpcJs(call.metadata),
    peer: call.getPeer(),
    header,
    sendHeader() {
      if (headerSent) {
        return;
      }

      if (!isEmptyMetadata(header)) {
        call.sendMetadata(convertMetadataToGrpcJs(header));
      }
      headerSent = true;
    },
    trailer,
    signal: maybeCancel.signal,
  };

  return {context, maybeCancel};
}

function isEmptyMetadata(metadata: Metadata) {
  for (const _ of metadata) {
    return false;
  }

  return true;
}
