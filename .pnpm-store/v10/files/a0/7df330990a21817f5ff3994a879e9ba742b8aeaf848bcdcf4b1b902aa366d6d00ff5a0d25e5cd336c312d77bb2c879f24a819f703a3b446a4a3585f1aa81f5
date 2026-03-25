"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMetadataToGrpcJs = convertMetadataToGrpcJs;
exports.convertMetadataFromGrpcJs = convertMetadataFromGrpcJs;
const grpc = __importStar(require("@grpc/grpc-js"));
const nice_grpc_common_1 = require("nice-grpc-common");
/** @internal */
function convertMetadataToGrpcJs(metadata) {
    const grpcMetadata = new grpc.Metadata();
    for (const [key, values] of metadata) {
        for (const value of values) {
            grpcMetadata.add(key, typeof value === 'string' ? value : Buffer.from(value));
        }
    }
    return grpcMetadata;
}
/** @internal */
function convertMetadataFromGrpcJs(grpcMetadata) {
    const metadata = (0, nice_grpc_common_1.Metadata)();
    for (const key of Object.keys(grpcMetadata.getMap())) {
        const value = grpcMetadata.get(key);
        metadata.set(key, value);
    }
    return metadata;
}
//# sourceMappingURL=convertMetadata.js.map