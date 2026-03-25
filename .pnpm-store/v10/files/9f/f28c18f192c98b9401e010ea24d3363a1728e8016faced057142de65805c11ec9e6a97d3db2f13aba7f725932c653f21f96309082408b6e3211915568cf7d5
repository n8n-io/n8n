type StringLiteral<Type> = Type extends string ? (string extends Type ? never : Type) : never;
declare const __OPAQUE_TYPE__: unique symbol;
export type WithOpaque<Token extends string> = {
    readonly [__OPAQUE_TYPE__]: Token;
};
export type Opaque<Type, Token extends string> = Token extends StringLiteral<Token> ? Type & WithOpaque<Token> : never;
export {};
