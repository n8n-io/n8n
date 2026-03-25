import { Plugin } from "./types";
export default function (plugins: Plugin<any>[]): {
    Type: {
        or(...types: any[]): import("./types").Type<any>;
        from<T>(value: any, name?: string | undefined): import("./types").Type<T>;
        def(typeName: string): import("./types").Def<any>;
        hasDef(typeName: string): boolean;
    };
    builtInTypes: {
        string: import("./types").Type<string>;
        function: import("./types").Type<Function>;
        array: import("./types").Type<any[]>;
        object: import("./types").Type<{
            [key: string]: any;
        }>;
        RegExp: import("./types").Type<RegExp>;
        Date: import("./types").Type<Date>;
        number: import("./types").Type<number>;
        boolean: import("./types").Type<boolean>;
        null: import("./types").Type<null>;
        undefined: import("./types").Type<undefined>;
        BigInt: import("./types").Type<BigInt>;
    };
    namedTypes: import("./gen/namedTypes").NamedTypes;
    builders: import("./gen/builders").builders;
    defineMethod: (name: any, func?: Function | undefined) => Function;
    getFieldNames: (object: any) => string[];
    getFieldValue: (object: any, fieldName: any) => any;
    eachField: (object: any, callback: (name: any, value: any) => any, context?: any) => void;
    someField: (object: any, callback: (name: any, value: any) => any, context?: any) => boolean;
    getSupertypeNames: (typeName: string) => string[];
    getBuilderName: (typeName: any) => any;
    astNodesAreEquivalent: {
        (a: any, b: any, problemPath?: any): boolean;
        assert(a: any, b: any): void;
    };
    finalize: () => void;
    Path: import("./path").PathConstructor;
    NodePath: import("./node-path").NodePathConstructor;
    PathVisitor: import("./path-visitor").PathVisitorConstructor;
    use: <T_1>(plugin: Plugin<T_1>) => T_1;
    visit: <M = {}>(node: import("./types").ASTNode, methods?: import("./main").Visitor<M> | undefined) => any;
};
