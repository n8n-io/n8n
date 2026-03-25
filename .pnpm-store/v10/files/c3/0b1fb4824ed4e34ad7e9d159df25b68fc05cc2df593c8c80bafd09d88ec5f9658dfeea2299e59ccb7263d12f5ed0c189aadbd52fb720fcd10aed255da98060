import { Schema } from "../../Schema";
export declare function property<RawKey extends string, RawValue, ParsedValue>(rawKey: RawKey, valueSchema: Schema<RawValue, ParsedValue>): Property<RawKey, RawValue, ParsedValue>;
export interface Property<RawKey extends string, RawValue, ParsedValue> {
    rawKey: RawKey;
    valueSchema: Schema<RawValue, ParsedValue>;
    isProperty: true;
}
export declare function isProperty<O extends Property<any, any, any>>(maybeProperty: unknown): maybeProperty is O;
