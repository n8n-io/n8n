import { schemaDeserializationMiddleware } from "./schemaDeserializationMiddleware";
import { schemaSerializationMiddleware } from "./schemaSerializationMiddleware";
export const deserializerMiddlewareOption = {
    name: "deserializerMiddleware",
    step: "deserialize",
    tags: ["DESERIALIZER"],
    override: true,
};
export const serializerMiddlewareOption = {
    name: "serializerMiddleware",
    step: "serialize",
    tags: ["SERIALIZER"],
    override: true,
};
export function getSchemaSerdePlugin(config) {
    return {
        applyToStack: (commandStack) => {
            commandStack.add(schemaSerializationMiddleware(config), serializerMiddlewareOption);
            commandStack.add(schemaDeserializationMiddleware(config), deserializerMiddlewareOption);
            config.protocol.setSerdeContext(config);
        },
    };
}
