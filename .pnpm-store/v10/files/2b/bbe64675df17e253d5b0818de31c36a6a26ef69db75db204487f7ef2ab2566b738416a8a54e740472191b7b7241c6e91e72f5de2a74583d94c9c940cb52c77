import { HttpBindingProtocol, HttpInterceptingShapeDeserializer, HttpInterceptingShapeSerializer, } from "@smithy/core/protocols";
import { NormalizedSchema, TypeRegistry } from "@smithy/core/schema";
import { ProtocolLib } from "../ProtocolLib";
import { loadRestXmlErrorCode } from "./parseXmlBody";
import { XmlCodec } from "./XmlCodec";
export class AwsRestXmlProtocol extends HttpBindingProtocol {
    codec;
    serializer;
    deserializer;
    mixin = new ProtocolLib();
    constructor(options) {
        super(options);
        const settings = {
            timestampFormat: {
                useTrait: true,
                default: 5,
            },
            httpBindings: true,
            xmlNamespace: options.xmlNamespace,
            serviceNamespace: options.defaultNamespace,
        };
        this.codec = new XmlCodec(settings);
        this.serializer = new HttpInterceptingShapeSerializer(this.codec.createSerializer(), settings);
        this.deserializer = new HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), settings);
    }
    getPayloadCodec() {
        return this.codec;
    }
    getShapeId() {
        return "aws.protocols#restXml";
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        const inputSchema = NormalizedSchema.of(operationSchema.input);
        if (!request.headers["content-type"]) {
            const contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
            if (contentType) {
                request.headers["content-type"] = contentType;
            }
        }
        if (request.headers["content-type"] === this.getDefaultContentType()) {
            if (typeof request.body === "string") {
                request.body = '<?xml version="1.0" encoding="UTF-8"?>' + request.body;
            }
        }
        return request;
    }
    async deserializeResponse(operationSchema, context, response) {
        return super.deserializeResponse(operationSchema, context, response);
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = loadRestXmlErrorCode(response, dataObject) ?? "Unknown";
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.Error?.message ?? dataObject.Error?.Message ?? dataObject.message ?? dataObject.Message ?? "Unknown";
        const ErrorCtor = TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor(message);
        await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
        const output = {};
        for (const [name, member] of ns.structIterator()) {
            const target = member.getMergedTraits().xmlName ?? name;
            const value = dataObject.Error?.[target] ?? dataObject[target];
            output[name] = this.codec.createDeserializer().readSchema(member, value);
        }
        throw Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output);
    }
    getDefaultContentType() {
        return "application/xml";
    }
}
