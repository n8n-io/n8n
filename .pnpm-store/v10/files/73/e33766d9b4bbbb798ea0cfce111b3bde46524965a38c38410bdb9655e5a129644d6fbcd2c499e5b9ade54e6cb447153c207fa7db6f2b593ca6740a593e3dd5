/**
 * Specificity as defined by Selectors spec.
 *
 * {@link https://www.w3.org/TR/selectors/#specificity}
 *
 * Three levels: for id, class, tag (type).
 *
 * Extra level(s) used in HTML styling don't fit the scope of this package
 * and no space reserved for them.
 */
export declare type Specificity = [number, number, number];
/**
 * Container for the associated value,
 * selector specificity and position in the selectors collection.
 *
 * @typeParam V - the type of the associated value.
 */
export declare type ValueContainer<V> = {
    index: number;
    specificity: Specificity;
    value: V;
};
/**
 * When reached a terminal node, decision tree adds
 * the value container to the list of successful matches.
 */
export declare type TerminalNode<V> = {
    type: 'terminal';
    valueContainer: ValueContainer<V>;
};
/**
 * Tag name has to be checked.
 * Underlying variants can be assembled
 * into a dictionary key check.
 */
export declare type TagNameNode<V> = {
    type: 'tagName';
    variants: VariantNode<V>[];
};
/**
 * String value variant.
 */
export declare type VariantNode<V> = {
    type: 'variant';
    value: string;
    cont: DecisionTreeNode<V>[];
};
/**
 * Have to check the presence of an element attribute
 * with the given name.
 */
export declare type AttrPresenceNode<V> = {
    type: 'attrPresence';
    name: string;
    cont: DecisionTreeNode<V>[];
};
/**
 * Have to check the value of an element attribute
 * with the given name.
 * It usually requires to run all underlying matchers
 * one after another.
 */
export declare type AttrValueNode<V> = {
    type: 'attrValue';
    name: string;
    matchers: MatcherNode<V>[];
};
/**
 * String value matcher.
 * Contains the predicate so no need to reimplement it
 * from descriptive parameters.
 */
export declare type MatcherNode<V> = {
    type: 'matcher';
    matcher: '=' | '~=' | '|=' | '^=' | '$=' | '*=';
    modifier: 'i' | 's' | null;
    value: string;
    predicate: (prop: string) => boolean;
    cont: DecisionTreeNode<V>[];
};
/**
 * Push next element on the stack, defined by the combinator.
 * Only `>` and `+` are expected to be supported.
 *
 * All checks are performed on the element on top of the stack.
 */
export declare type PushElementNode<V> = {
    type: 'pushElement';
    combinator: '>' | '+';
    cont: DecisionTreeNode<V>[];
};
/**
 * Remove the top element from the stack -
 * following checks are performed on the previous element.
 */
export declare type PopElementNode<V> = {
    type: 'popElement';
    cont: DecisionTreeNode<V>[];
};
export declare type DecisionTreeNode<V> = TerminalNode<V> | TagNameNode<V> | AttrPresenceNode<V> | AttrValueNode<V> | PushElementNode<V> | PopElementNode<V>;
