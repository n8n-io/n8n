import { Schema } from "./Schema";
export class ListSchema extends Schema {
    static symbol = Symbol.for("@smithy/lis");
    name;
    traits;
    valueSchema;
    symbol = ListSchema.symbol;
}
export const list = (namespace, name, traits, valueSchema) => Schema.assign(new ListSchema(), {
    name,
    namespace,
    traits,
    valueSchema,
});
