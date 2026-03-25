/**
 * This module defines nodes used to define types and validations for objects and interfaces.
 */
import { IContext } from "./util";
export declare type CheckerFunc = (value: any, ctx: IContext) => boolean;
/** Node that represents a type. */
export declare abstract class TType {
    abstract getChecker(suite: ITypeSuite, strict: boolean, allowedProps?: Set<string>): CheckerFunc;
}
/**
 * Descriptor from which TType may be build (by parseSpec()). A plain string is equivalent to
 * name(string).
 */
export declare type TypeSpec = TType | string;
/**
 * Represents a suite of named types. Suites are used to resolve type names.
 */
export interface ITypeSuite {
    [name: string]: TType;
}
/**
 * Defines a type name, either built-in, or defined in this suite. It can typically be included in
 * the specs as just a plain string.
 */
export declare function name(value: string): TName;
export declare class TName extends TType {
    name: string;
    private _failMsg;
    constructor(name: string);
    getChecker(suite: ITypeSuite, strict: boolean, allowedProps?: Set<string>): CheckerFunc;
}
/**
 * Defines a literal value, e.g. lit('hello') or lit(123).
 */
export declare function lit(value: any): TLiteral;
export declare class TLiteral extends TType {
    value: any;
    name: string;
    private _failMsg;
    constructor(value: any);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines an array type, e.g. array('number').
 */
export declare function array(typeSpec: TypeSpec): TArray;
export declare class TArray extends TType {
    ttype: TType;
    constructor(ttype: TType);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines a tuple type, e.g. tuple('string', 'number').
 */
export declare function tuple(...typeSpec: TypeSpec[]): TTuple;
export declare class TTuple extends TType {
    ttypes: TType[];
    constructor(ttypes: TType[]);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines a union type, e.g. union('number', 'null').
 */
export declare function union(...typeSpec: TypeSpec[]): TUnion;
export declare class TUnion extends TType {
    ttypes: TType[];
    private _failMsg;
    constructor(ttypes: TType[]);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines an intersection type, e.g. intersection('number', 'null').
 */
export declare function intersection(...typeSpec: TypeSpec[]): TIntersection;
export declare class TIntersection extends TType {
    ttypes: TType[];
    constructor(ttypes: TType[]);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines an enum type, e.g. enum({'A': 1, 'B': 2}).
 */
export declare function enumtype(values: {
    [name: string]: string | number;
}): TEnumType;
export declare class TEnumType extends TType {
    members: {
        [name: string]: string | number;
    };
    readonly validValues: Set<string | number>;
    private _failMsg;
    constructor(members: {
        [name: string]: string | number;
    });
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines a literal enum value, such as Direction.Up, specified as enumlit("Direction", "Up").
 */
export declare function enumlit(name: string, prop: string): TEnumLiteral;
export declare class TEnumLiteral extends TType {
    enumName: string;
    prop: string;
    private _failMsg;
    constructor(enumName: string, prop: string);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines an interface. The first argument is an array of interfaces that it extends, and the
 * second is an array of properties.
 */
export declare function iface(bases: string[], props: {
    [name: string]: TOptional | TypeSpec;
}): TIface;
export declare class TIface extends TType {
    bases: string[];
    props: TProp[];
    private propSet;
    constructor(bases: string[], props: TProp[]);
    getChecker(suite: ITypeSuite, strict: boolean, allowedProps?: Set<string>): CheckerFunc;
}
/**
 * Defines an optional property on an interface.
 */
export declare function opt(typeSpec: TypeSpec): TOptional;
export declare class TOptional extends TType {
    ttype: TType;
    constructor(ttype: TType);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines a property in an interface.
 */
export declare class TProp {
    name: string;
    ttype: TType;
    isOpt: boolean;
    constructor(name: string, ttype: TType, isOpt: boolean);
}
/**
 * Defines a function. The first argument declares the function's return type, the rest declare
 * its parameters.
 */
export declare function func(resultSpec: TypeSpec, ...params: TParam[]): TFunc;
export declare class TFunc extends TType {
    paramList: TParamList;
    result: TType;
    constructor(paramList: TParamList, result: TType);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines a function parameter.
 */
export declare function param(name: string, typeSpec: TypeSpec, isOpt?: boolean): TParam;
export declare class TParam {
    name: string;
    ttype: TType;
    isOpt: boolean;
    constructor(name: string, ttype: TType, isOpt: boolean);
}
/**
 * Defines a function parameter list.
 */
export declare class TParamList extends TType {
    params: TParam[];
    constructor(params: TParam[]);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Single TType implementation for all basic built-in types.
 */
export declare class BasicType extends TType {
    validator: (value: any) => boolean;
    private message;
    constructor(validator: (value: any) => boolean, message: string);
    getChecker(suite: ITypeSuite, strict: boolean): CheckerFunc;
}
/**
 * Defines the suite of basic types.
 */
export declare const basicTypes: ITypeSuite;
