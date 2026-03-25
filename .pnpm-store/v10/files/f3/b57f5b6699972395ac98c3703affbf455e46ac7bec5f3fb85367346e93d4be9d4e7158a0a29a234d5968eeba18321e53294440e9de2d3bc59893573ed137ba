export interface $ZSF {
    $zsf: {
        version: number;
    };
    type: string;
    default: unknown;
    fallback: unknown;
}
export interface $ZSFString extends $ZSF {
    type: "string";
    min_length?: number;
    max_length?: number;
    pattern?: string;
}
export type NumberTypes = "float32" | "int32" | "uint32" | "float64" | "int64" | "uint64" | "bigint" | "bigdecimal";
export interface $ZSFNumber extends $ZSF {
    type: "number";
    format?: NumberTypes;
    minimum?: number;
    maximum?: number;
    multiple_of?: number;
}
export interface $ZSFBoolean extends $ZSF {
    type: "boolean";
}
export interface $ZSFNull extends $ZSF {
    type: "null";
}
export interface $ZSFUndefined extends $ZSF {
    type: "undefined";
}
export interface $ZSFOptional<T extends $ZSF = $ZSF> extends $ZSF {
    type: "optional";
    inner: T;
}
export interface $ZSFNever extends $ZSF {
    type: "never";
}
export interface $ZSFAny extends $ZSF {
    type: "any";
}
/** Supports */
export interface $ZSFEnum<Elements extends {
    [k: string]: $ZSFLiteral;
} = {
    [k: string]: $ZSFLiteral;
}> extends $ZSF {
    type: "enum";
    elements: Elements;
}
export interface $ZSFArray<PrefixItems extends $ZSF[] = $ZSF[], Items extends $ZSF = $ZSF> extends $ZSF {
    type: "array";
    prefixItems: PrefixItems;
    items: Items;
}
type $ZSFObjectProperties = Array<{
    key: string;
    value: $ZSF;
    format?: "literal" | "pattern";
    ordering?: number;
}>;
export interface $ZSFObject<Properties extends $ZSFObjectProperties = $ZSFObjectProperties> extends $ZSF {
    type: "object";
    properties: Properties;
}
/** Supports arbitrary literal values */
export interface $ZSFLiteral<T extends $ZSF = $ZSF> extends $ZSF {
    type: "literal";
    schema: T;
    value: unknown;
}
export interface $ZSFUnion<Elements extends $ZSF[] = $ZSF[]> extends $ZSF {
    type: "union";
    elements: Elements;
}
export interface $ZSFIntersection extends $ZSF {
    type: "intersection";
    elements: $ZSF[];
}
export interface $ZSFMap<K extends $ZSF = $ZSF, V extends $ZSF = $ZSF> extends $ZSF {
    type: "map";
    keys: K;
    values: V;
}
export interface $ZSFConditional<If extends $ZSF, Then extends $ZSF, Else extends $ZSF> extends $ZSF {
    type: "conditional";
    if: If;
    then: Then;
    else: Else;
}
export {};
