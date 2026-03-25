"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaTypeExamplesOverride = void 0;
const utils_1 = require("../../utils");
const ref_utils_1 = require("../../ref-utils");
const MediaTypeExamplesOverride = ({ operationIds }) => {
    return {
        Operation: {
            enter(operation, ctx) {
                const operationId = operation.operationId;
                if (!operationId) {
                    return;
                }
                const properties = operationIds[operationId];
                if (!properties) {
                    return;
                }
                if (properties.responses && operation.responses) {
                    for (const responseCode of Object.keys(properties.responses)) {
                        const resolvedResponse = checkAndResolveRef(operation.responses[responseCode], ctx.resolve);
                        if (!resolvedResponse) {
                            continue;
                        }
                        resolvedResponse.content = resolvedResponse.content ? resolvedResponse.content : {};
                        Object.keys(properties.responses[responseCode]).forEach((mimeType) => {
                            resolvedResponse.content[mimeType] = {
                                ...resolvedResponse.content[mimeType],
                                examples: (0, utils_1.yamlAndJsonSyncReader)(properties.responses[responseCode][mimeType]),
                            };
                        });
                        operation.responses[responseCode] = resolvedResponse;
                    }
                }
                if (properties.request && operation.requestBody) {
                    const resolvedRequest = checkAndResolveRef(operation.requestBody, ctx.resolve);
                    if (!resolvedRequest) {
                        return;
                    }
                    resolvedRequest.content = resolvedRequest.content ? resolvedRequest.content : {};
                    Object.keys(properties.request).forEach((mimeType) => {
                        resolvedRequest.content[mimeType] = {
                            ...resolvedRequest.content[mimeType],
                            examples: (0, utils_1.yamlAndJsonSyncReader)(properties.request[mimeType]),
                        };
                    });
                    operation.requestBody = resolvedRequest;
                }
            },
        },
    };
};
exports.MediaTypeExamplesOverride = MediaTypeExamplesOverride;
function checkAndResolveRef(node, resolver) {
    if (!(0, ref_utils_1.isRef)(node)) {
        return node;
    }
    const resolved = resolver(node);
    return resolved.error ? undefined : JSON.parse(JSON.stringify(resolved.node));
}
