import { DecisionTreeNode, ValueContainer } from './Ast';
/**
 * A function that turn a decision tree into a usable form.
 *
 * @typeParam V - the type of associated value.
 *
 * @typeParam R - return type for this builder
 * (Consider using {@link Picker}.)
 */
export declare type BuilderFunction<V, R> = (nodes: DecisionTreeNode<V>[]) => R;
/**
 * Recommended matcher function shape to implement
 * in builders.
 *
 * The elements stack is represented as the arguments array.
 *
 * @typeParam L - the type of elements in a particular DOM AST.
 * @typeParam V - the type of associated value.
 */
export declare type MatcherFunction<L, V> = (el: L, ...tail: L[]) => ValueContainer<V>[];
