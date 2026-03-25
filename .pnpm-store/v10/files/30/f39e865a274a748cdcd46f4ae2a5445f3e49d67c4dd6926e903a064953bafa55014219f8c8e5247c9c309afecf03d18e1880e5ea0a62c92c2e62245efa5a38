import { Schema } from "./Schema";
import { StructureSchema } from "./StructureSchema";
export class ErrorSchema extends StructureSchema {
    static symbol = Symbol.for("@smithy/err");
    ctor;
    symbol = ErrorSchema.symbol;
}
export const error = (namespace, name, traits, memberNames, memberList, ctor) => Schema.assign(new ErrorSchema(), {
    name,
    namespace,
    traits,
    memberNames,
    memberList,
    ctor: null,
});
