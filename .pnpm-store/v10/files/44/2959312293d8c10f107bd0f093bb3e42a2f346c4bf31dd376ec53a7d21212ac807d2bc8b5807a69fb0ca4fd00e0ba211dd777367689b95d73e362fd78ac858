"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromTsProtoServiceDefinition = fromTsProtoServiceDefinition;
exports.isTsProtoServiceDefinition = isTsProtoServiceDefinition;
function fromTsProtoServiceDefinition(definition) {
    const result = {};
    for (const [key, method] of Object.entries(definition.methods)) {
        const requestEncode = method.requestType.encode;
        const requestFromPartial = method.requestType.fromPartial;
        const responseEncode = method.responseType.encode;
        const responseFromPartial = method.responseType.fromPartial;
        result[key] = {
            path: `/${definition.fullName}/${method.name}`,
            requestStream: method.requestStream,
            responseStream: method.responseStream,
            requestDeserialize: method.requestType.decode,
            requestSerialize: requestFromPartial != null
                ? value => requestEncode(requestFromPartial(value)).finish()
                : value => requestEncode(value).finish(),
            responseDeserialize: method.responseType.decode,
            responseSerialize: responseFromPartial != null
                ? value => responseEncode(responseFromPartial(value)).finish()
                : value => responseEncode(value).finish(),
            options: method.options,
        };
    }
    return result;
}
function isTsProtoServiceDefinition(definition) {
    return ('name' in definition && 'fullName' in definition && 'methods' in definition);
}
//# sourceMappingURL=ts-proto.js.map