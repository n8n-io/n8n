import { Schema } from "./Schema";
export class MapSchema extends Schema {
    static symbol = Symbol.for("@smithy/map");
    name;
    traits;
    keySchema;
    valueSchema;
    symbol = MapSchema.symbol;
}
export const map = (namespace, name, traits, keySchema, valueSchema) => Schema.assign(new MapSchema(), {
    name,
    namespace,
    traits,
    keySchema,
    valueSchema,
});
