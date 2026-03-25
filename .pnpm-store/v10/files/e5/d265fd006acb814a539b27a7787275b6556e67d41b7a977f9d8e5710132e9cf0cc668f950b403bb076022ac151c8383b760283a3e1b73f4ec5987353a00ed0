import * as t from '@babel/types';
export declare type NodeType<type extends string> = type extends keyof t.Aliases ? t.Aliases[type] : Extract<t.Node, {
    type: type;
}>;
export declare type SimpleFunction<TKey extends string, TState> = (node: NodeType<TKey>, state: TState) => void;
export declare type SimpleVisitors<TState = void> = {
    [key in keyof t.Aliases | t.Node['type']]?: SimpleFunction<key, TState> | {
        enter?: SimpleFunction<key, TState>;
        exit?: SimpleFunction<key, TState>;
    };
};
export declare function simple<TState = void>(visitors: SimpleVisitors<TState>): (node: t.Node, state: TState) => void;
export declare type AncestorFunction<TKey extends string, TState> = (node: NodeType<TKey>, state: TState, ancestors: t.Node[]) => void;
export declare type AncestorVisitor<TState = void> = {
    [key in keyof t.Aliases | t.Node['type']]?: AncestorFunction<key, TState> | {
        enter?: AncestorFunction<key, TState>;
        exit?: AncestorFunction<key, TState>;
    };
};
export declare function ancestor<TState = void>(visitors: AncestorVisitor<TState>): (node: t.Node, state: TState) => void;
export declare type RecursiveVisitors<TState = void> = {
    [key in keyof t.Aliases | t.Node['type']]?: (node: NodeType<key>, state: TState, recurse: (node: t.Node) => void) => void;
};
export declare function recursive<TState = void>(visitors: RecursiveVisitors<TState>): (node: t.Node, state: TState) => void;
