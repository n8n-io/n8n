import { inferParsed, inferRaw, Schema } from "../../Schema";
export declare type UndiscriminatedUnionSchema<Schemas extends [...Schema[]]> = Schema<inferRawUnidiscriminatedUnionSchema<Schemas>, inferParsedUnidiscriminatedUnionSchema<Schemas>>;
export declare type inferRawUnidiscriminatedUnionSchema<Schemas extends [...Schema[]]> = inferRaw<Schemas[number]>;
export declare type inferParsedUnidiscriminatedUnionSchema<Schemas extends [...Schema[]]> = inferParsed<Schemas[number]>;
