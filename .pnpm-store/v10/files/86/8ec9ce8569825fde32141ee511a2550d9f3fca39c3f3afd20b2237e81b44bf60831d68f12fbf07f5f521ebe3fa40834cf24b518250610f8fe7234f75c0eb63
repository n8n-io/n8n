import { Schema } from "./Schema";
export class OperationSchema extends Schema {
    static symbol = Symbol.for("@smithy/ope");
    name;
    traits;
    input;
    output;
    symbol = OperationSchema.symbol;
}
export const op = (namespace, name, traits, input, output) => Schema.assign(new OperationSchema(), {
    name,
    namespace,
    traits,
    input,
    output,
});
