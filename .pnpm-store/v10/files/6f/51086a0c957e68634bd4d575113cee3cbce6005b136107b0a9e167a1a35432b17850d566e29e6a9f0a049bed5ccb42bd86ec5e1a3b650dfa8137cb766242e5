/**
 * Represents a reference to a declaration.
 * @beta
 */
export declare class DeclarationReference {
    private _source;
    private _navigation;
    private _symbol;
    constructor(source?: ModuleSource | GlobalSource, navigation?: Navigation.Locals | Navigation.Exports, symbol?: SymbolReference);
    get source(): ModuleSource | GlobalSource | undefined;
    get navigation(): Navigation.Locals | Navigation.Exports | undefined;
    get symbol(): SymbolReference | undefined;
    get isEmpty(): boolean;
    static parse(text: string): DeclarationReference;
    static parseComponent(text: string): Component;
    /**
     * Determines whether the provided string is a well-formed symbol navigation component string.
     */
    static isWellFormedComponentString(text: string): boolean;
    /**
     * Escapes a string for use as a symbol navigation component. If the string contains any of `!.#~:,"{}()@` or starts
     * with `[`, it is enclosed in quotes.
     */
    static escapeComponentString(text: string): string;
    /**
     * Unescapes a string used as a symbol navigation component.
     */
    static unescapeComponentString(text: string): string;
    /**
     * Determines whether the provided string is a well-formed module source string. The string may not
     * have a trailing `!` character.
     */
    static isWellFormedModuleSourceString(text: string): boolean;
    /**
     * Escapes a string for use as a module source. If the string contains any of `!"` it is enclosed in quotes.
     */
    static escapeModuleSourceString(text: string): string;
    /**
     * Unescapes a string used as a module source. The string may not have a trailing `!` character.
     */
    static unescapeModuleSourceString(text: string): string;
    static empty(): DeclarationReference;
    static package(packageName: string, importPath?: string): DeclarationReference;
    static module(path: string, userEscaped?: boolean): DeclarationReference;
    static global(): DeclarationReference;
    static from(base: DeclarationReference | undefined): DeclarationReference;
    withSource(source: ModuleSource | GlobalSource | undefined): DeclarationReference;
    withNavigation(navigation: Navigation.Locals | Navigation.Exports | undefined): DeclarationReference;
    withSymbol(symbol: SymbolReference | undefined): DeclarationReference;
    withComponentPath(componentPath: ComponentPath): DeclarationReference;
    withMeaning(meaning: Meaning | undefined): DeclarationReference;
    withOverloadIndex(overloadIndex: number | undefined): DeclarationReference;
    addNavigationStep(navigation: Navigation, component: ComponentLike): DeclarationReference;
    toString(): string;
}
/**
 * Indicates the symbol table from which to resolve the next symbol component.
 * @beta
 */
export declare enum Navigation {
    Exports = ".",
    Members = "#",
    Locals = "~"
}
/**
 * Represents a module.
 * @beta
 */
export declare class ModuleSource {
    readonly escapedPath: string;
    private _path;
    private _pathComponents;
    constructor(path: string, userEscaped?: boolean);
    get path(): string;
    get packageName(): string;
    get scopeName(): string;
    get unscopedPackageName(): string;
    get importPath(): string;
    static fromScopedPackage(scopeName: string | undefined, unscopedPackageName: string, importPath?: string): ModuleSource;
    static fromPackage(packageName: string, importPath?: string): ModuleSource;
    private static _fromPackageName;
    toString(): string;
    private _getOrParsePathComponents;
}
/**
 * Represents the global scope.
 * @beta
 */
export declare class GlobalSource {
    static readonly instance: GlobalSource;
    private constructor();
    toString(): string;
}
/**
 * @beta
 */
export type Component = ComponentString | ComponentReference;
/**
 * @beta
 */
export declare namespace Component {
    function from(value: ComponentLike): Component;
}
/**
 * @beta
 */
export type ComponentLike = Component | DeclarationReference | string;
/**
 * @beta
 */
export declare class ComponentString {
    readonly text: string;
    constructor(text: string, userEscaped?: boolean);
    toString(): string;
}
/**
 * @beta
 */
export declare class ComponentReference {
    readonly reference: DeclarationReference;
    constructor(reference: DeclarationReference);
    static parse(text: string): ComponentReference;
    withReference(reference: DeclarationReference): ComponentReference;
    toString(): string;
}
/**
 * @beta
 */
export type ComponentPath = ComponentRoot | ComponentNavigation;
/**
 * @beta
 */
export declare abstract class ComponentPathBase {
    readonly component: Component;
    constructor(component: Component);
    addNavigationStep(this: ComponentPath, navigation: Navigation, component: ComponentLike): ComponentPath;
    abstract toString(): string;
}
/**
 * @beta
 */
export declare class ComponentRoot extends ComponentPathBase {
    withComponent(component: ComponentLike): ComponentRoot;
    toString(): string;
}
/**
 * @beta
 */
export declare class ComponentNavigation extends ComponentPathBase {
    readonly parent: ComponentPath;
    readonly navigation: Navigation;
    constructor(parent: ComponentPath, navigation: Navigation, component: Component);
    withParent(parent: ComponentPath): ComponentNavigation;
    withNavigation(navigation: Navigation): ComponentNavigation;
    withComponent(component: ComponentLike): ComponentNavigation;
    toString(): string;
}
/**
 * @beta
 */
export declare enum Meaning {
    Class = "class",// SymbolFlags.Class
    Interface = "interface",// SymbolFlags.Interface
    TypeAlias = "type",// SymbolFlags.TypeAlias
    Enum = "enum",// SymbolFlags.Enum
    Namespace = "namespace",// SymbolFlags.Module
    Function = "function",// SymbolFlags.Function
    Variable = "var",// SymbolFlags.Variable
    Constructor = "constructor",// SymbolFlags.Constructor
    Member = "member",// SymbolFlags.ClassMember | SymbolFlags.EnumMember
    Event = "event",//
    CallSignature = "call",// SymbolFlags.Signature (for __call)
    ConstructSignature = "new",// SymbolFlags.Signature (for __new)
    IndexSignature = "index",// SymbolFlags.Signature (for __index)
    ComplexType = "complex"
}
/**
 * @beta
 */
export interface ISymbolReferenceOptions {
    meaning?: Meaning;
    overloadIndex?: number;
}
/**
 * Represents a reference to a TypeScript symbol.
 * @beta
 */
export declare class SymbolReference {
    readonly componentPath: ComponentPath | undefined;
    readonly meaning: Meaning | undefined;
    readonly overloadIndex: number | undefined;
    constructor(component: ComponentPath | undefined, { meaning, overloadIndex }?: ISymbolReferenceOptions);
    static empty(): SymbolReference;
    withComponentPath(componentPath: ComponentPath | undefined): SymbolReference;
    withMeaning(meaning: Meaning | undefined): SymbolReference;
    withOverloadIndex(overloadIndex: number | undefined): SymbolReference;
    addNavigationStep(navigation: Navigation, component: ComponentLike): SymbolReference;
    toString(): string;
}
//# sourceMappingURL=DeclarationReference.d.ts.map