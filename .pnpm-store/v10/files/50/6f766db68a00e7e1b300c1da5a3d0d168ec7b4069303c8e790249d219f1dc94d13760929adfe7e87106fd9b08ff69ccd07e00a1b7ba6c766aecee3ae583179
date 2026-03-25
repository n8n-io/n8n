"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCallContext = createCallContext;
const nice_grpc_common_1 = require("nice-grpc-common");
const convertMetadata_1 = require("../utils/convertMetadata");
/** @internal */
function createCallContext(call) {
    const ac = new AbortController();
    const maybeCancel = {
        signal: ac.signal,
        cancel() {
            ac.abort();
        },
    };
    const header = (0, nice_grpc_common_1.Metadata)();
    const trailer = (0, nice_grpc_common_1.Metadata)();
    if (call.cancelled) {
        maybeCancel.cancel?.();
        maybeCancel.cancel = undefined;
    }
    else {
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
        metadata: (0, convertMetadata_1.convertMetadataFromGrpcJs)(call.metadata),
        peer: call.getPeer(),
        header,
        sendHeader() {
            if (headerSent) {
                return;
            }
            if (!isEmptyMetadata(header)) {
                call.sendMetadata((0, convertMetadata_1.convertMetadataToGrpcJs)(header));
            }
            headerSent = true;
        },
        trailer,
        signal: maybeCancel.signal,
    };
    return { context, maybeCancel };
}
function isEmptyMetadata(metadata) {
    for (const _ of metadata) {
        return false;
    }
    return true;
}
//# sourceMappingURL=createCallContext.js.map