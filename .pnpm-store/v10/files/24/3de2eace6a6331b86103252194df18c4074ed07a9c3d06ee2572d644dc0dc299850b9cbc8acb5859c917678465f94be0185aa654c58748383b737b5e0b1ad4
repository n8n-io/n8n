export type Fork = {
    use<T>(plugin: Plugin<T>): T;
};
export type Plugin<T> = (fork: Fork) => T;
export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
type Deep = boolean | ((type: Type<any>, value: any) => void);
export type Type<T> = ArrayType<T> | IdentityType<T> | ObjectType<T> | OrType<T> | PredicateType<T>;
export interface AnyType {
    toString(): string;
    check(value: any, deep?: Deep): boolean;
    assert(value: any, deep?: Deep): boolean;
    arrayOf(): AnyType;
}
declare abstract class BaseType<T> {
    abstract toString(): string;
    abstract check(value: any, deep?: Deep): value is T;
    assert(value: any, deep?: Deep): value is T;
    arrayOf(): Type<T[]>;
}
declare class ArrayType<T> extends BaseType<T> {
    readonly elemType: Type<T extends (infer E)[] ? E : never>;
    readonly kind: "ArrayType";
    constructor(elemType: Type<T extends (infer E)[] ? E : never>);
    toString(): string;
    check(value: any, deep?: Deep): value is T;
}
declare class IdentityType<T> extends BaseType<T> {
    readonly value: T;
    readonly kind: "IdentityType";
    constructor(value: T);
    toString(): string;
    check(value: any, deep?: Deep): value is T;
}
declare class ObjectType<T> extends BaseType<T> {
    readonly fields: Field<any>[];
    readonly kind: "ObjectType";
    constructor(fields: Field<any>[]);
    toString(): string;
    check(value: any, deep?: Deep): value is T;
}
declare class OrType<T> extends BaseType<T> {
    readonly types: Type<any>[];
    readonly kind: "OrType";
    constructor(types: Type<any>[]);
    toString(): string;
    check(value: any, deep?: Deep): value is T;
}
declare class PredicateType<T> extends BaseType<T> {
    readonly name: string;
    readonly predicate: (value: any, deep?: Deep) => boolean;
    readonly kind: "PredicateType";
    constructor(name: string, predicate: (value: any, deep?: Deep) => boolean);
    toString(): string;
    check(value: any, deep?: Deep): value is T;
}
export declare abstract class Def<T = any> {
    readonly type: Type<T>;
    readonly typeName: string;
    baseNames: string[];
    ownFields: {
        [name: string]: Field<any>;
    };
    allSupertypes: {
        [name: string]: Def<any>;
    };
    supertypeList: string[];
    allFields: {
        [name: string]: Field<any>;
    };
    fieldNames: string[];
    finalized: boolean;
    buildable: boolean;
    buildParams: string[];
    constructor(type: Type<T>, typeName: string);
    isSupertypeOf(that: Def<any>): boolean;
    checkAllFields(value: any, deep?: any): boolean;
    abstract check(value: any, deep?: any): boolean;
    bases(...supertypeNames: string[]): this;
    abstract build(...buildParams: string[]): this;
    abstract field(name: string, type: any, defaultFn?: Function, hidden?: boolean): this;
    abstract finalize(): void;
}
declare class Field<T> {
    readonly name: string;
    readonly type: Type<T>;
    readonly defaultFn?: Function | undefined;
    readonly hidden: boolean;
    constructor(name: string, type: Type<T>, defaultFn?: Function | undefined, hidden?: boolean);
    toString(): string;
    getValue(obj: {
        [key: string]: any;
    }): any;
}
type FieldType<T> = Field<T>;
export { FieldType as Field };
export interface ASTNode {
    type: string;
}
export interface Builder {
    (...args: any[]): ASTNode;
    from(obj: {
        [param: string]: any;
    }): ASTNode;
}
export default function typesPlugin(_fork: Fork): {
    Type: {
        or(...types: any[]): Type<any>;
        from<T>(value: any, name?: string): Type<T>;
        def(typeName: string): Def;
        hasDef(typeName: string): boolean;
    };
    builtInTypes: {
        string: Type<string>;
        function: Type<Function>;
        array: Type<any[]>;
        object: Type<{
            [key: string]: any;
        }>;
        RegExp: Type<RegExp>;
        Date: Type<Date>;
        number: Type<number>;
        boolean: Type<boolean>;
        null: Type<null>;
        undefined: Type<undefined>;
        BigInt: Type<BigInt>;
    };
    getSupertypeNames: (typeName: string) => string[];
    computeSupertypeLookupTable: (candidates: any) => {
        [typeName: string]: any;
    };
    builders: import("./gen/builders").builders;
    defineMethod: (name: any, func?: Function) => Function;
    getBuilderName: (typeName: any) => any;
    getStatementBuilderName: (typeName: any) => any;
    namedTypes: import("./gen/namedTypes").NamedTypes;
    getFieldNames: (object: any) => string[];
    getFieldValue: (object: any, fieldName: any) => any;
    eachField: (object: any, callback: (name: any, value: any) => any, context?: any) => void;
    someField: (object: any, callback: (name: any, value: any) => any, context?: any) => boolean;
    finalize: () => void;
};
