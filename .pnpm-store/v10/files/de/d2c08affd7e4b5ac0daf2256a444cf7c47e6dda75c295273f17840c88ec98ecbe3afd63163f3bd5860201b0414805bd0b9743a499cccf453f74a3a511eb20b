import { Schema } from "./Schema";
export class SimpleSchema extends Schema {
    static symbol = Symbol.for("@smithy/sim");
    name;
    schemaRef;
    traits;
    symbol = SimpleSchema.symbol;
}
export const sim = (namespace, name, schemaRef, traits) => Schema.assign(new SimpleSchema(), {
    name,
    namespace,
    traits,
    schemaRef,
});
export const simAdapter = (namespace, name, traits, schemaRef) => Schema.assign(new SimpleSchema(), {
    name,
    namespace,
    traits,
    schemaRef,
});
