import { SimplifyDeep } from '../types';
import { JsonPathToAccessor } from './utils';
/**
 * Parses a query.
 * A query is a sequence of nodes, separated by `,`, ensuring that there is
 * no remaining input after all nodes have been parsed.
 *
 * Returns an array of parsed nodes, or an error.
 */
export declare type ParseQuery<Query extends string> = string extends Query ? GenericStringError : ParseNodes<EatWhitespace<Query>> extends [infer Nodes, `${infer Remainder}`] ? Nodes extends Ast.Node[] ? EatWhitespace<Remainder> extends '' ? SimplifyDeep<Nodes> : ParserError<`Unexpected input: ${Remainder}`> : ParserError<'Invalid nodes array structure'> : ParseNodes<EatWhitespace<Query>>;
/**
 * Notes: all `Parse*` types assume that their input strings have their whitespace
 * removed. They return tuples of ["Return Value", "Remainder of text"] or
 * a `ParserError`.
 */
/**
 * Parses a sequence of nodes, separated by `,`.
 *
 * Returns a tuple of ["Parsed fields", "Remainder of text"] or an error.
 */
declare type ParseNodes<Input extends string> = string extends Input ? GenericStringError : ParseNodesHelper<Input, []>;
declare type ParseNodesHelper<Input extends string, Nodes extends Ast.Node[]> = ParseNode<Input> extends [
    infer Node,
    `${infer Remainder}`
] ? Node extends Ast.Node ? EatWhitespace<Remainder> extends `,${infer Remainder}` ? ParseNodesHelper<EatWhitespace<Remainder>, [...Nodes, Node]> : [[...Nodes, Node], EatWhitespace<Remainder>] : ParserError<'Invalid node type in nodes helper'> : ParseNode<Input>;
/**
 * Parses a node.
 * A node is one of the following:
 * - `*`
 * - a field, as defined above
 * - a renamed field, `renamed_field:field`
 * - a spread field, `...field`
 */
declare type ParseNode<Input extends string> = Input extends '' ? ParserError<'Empty string'> : Input extends `*${infer Remainder}` ? [Ast.StarNode, EatWhitespace<Remainder>] : Input extends `...${infer Remainder}` ? ParseField<EatWhitespace<Remainder>> extends [infer TargetField, `${infer Remainder}`] ? TargetField extends Ast.FieldNode ? [{
    type: 'spread';
    target: TargetField;
}, EatWhitespace<Remainder>] : ParserError<'Invalid target field type in spread'> : ParserError<`Unable to parse spread resource at \`${Input}\``> : ParseIdentifier<Input> extends [infer NameOrAlias, `${infer Remainder}`] ? EatWhitespace<Remainder> extends `::${infer _}` ? ParseField<Input> : EatWhitespace<Remainder> extends `:${infer Remainder}` ? ParseField<EatWhitespace<Remainder>> extends [infer Field, `${infer Remainder}`] ? Field extends Ast.FieldNode ? [Omit<Field, 'alias'> & {
    alias: NameOrAlias;
}, EatWhitespace<Remainder>] : ParserError<'Invalid field type in alias parsing'> : ParserError<`Unable to parse renamed field at \`${Input}\``> : ParseField<Input> : ParserError<`Expected identifier at \`${Input}\``>;
/**
 * Parses a field without preceding alias.
 * A field is one of the following:
 * - a top-level `count` field: https://docs.postgrest.org/en/v12/references/api/aggregate_functions.html#the-case-of-count
 * - a field with an embedded resource
 *   - `field(nodes)`
 *   - `field!hint(nodes)`
 *   - `field!inner(nodes)`
 *   - `field!left(nodes)`
 *   - `field!hint!inner(nodes)`
 *   - `field!hint!left(nodes)`
 * - a field without an embedded resource (see {@link ParseNonEmbeddedResourceField})
 */
declare type ParseField<Input extends string> = Input extends '' ? ParserError<'Empty string'> : ParseIdentifier<Input> extends [infer Name, `${infer Remainder}`] ? Name extends 'count' ? ParseCountField<Input> : Remainder extends `!inner${infer Remainder}` ? ParseEmbeddedResource<EatWhitespace<Remainder>> extends [infer Children, `${infer Remainder}`] ? Children extends Ast.Node[] ? [
    {
        type: 'field';
        name: Name;
        innerJoin: true;
        children: Children;
    },
    Remainder
] : ParserError<'Invalid children array in inner join'> : CreateParserErrorIfRequired<ParseEmbeddedResource<EatWhitespace<Remainder>>, `Expected embedded resource after "!inner" at \`${Remainder}\``> : EatWhitespace<Remainder> extends `!left${infer Remainder}` ? ParseEmbeddedResource<EatWhitespace<Remainder>> extends [infer Children, `${infer Remainder}`] ? Children extends Ast.Node[] ? [
    {
        type: 'field';
        name: Name;
        children: Children;
    },
    EatWhitespace<Remainder>
] : ParserError<'Invalid children array in left join'> : CreateParserErrorIfRequired<ParseEmbeddedResource<EatWhitespace<Remainder>>, `Expected embedded resource after "!left" at \`${EatWhitespace<Remainder>}\``> : EatWhitespace<Remainder> extends `!${infer Remainder}` ? ParseIdentifier<EatWhitespace<Remainder>> extends [infer Hint, `${infer Remainder}`] ? EatWhitespace<Remainder> extends `!inner${infer Remainder}` ? ParseEmbeddedResource<EatWhitespace<Remainder>> extends [
    infer Children,
    `${infer Remainder}`
] ? Children extends Ast.Node[] ? [
    {
        type: 'field';
        name: Name;
        hint: Hint;
        innerJoin: true;
        children: Children;
    },
    EatWhitespace<Remainder>
] : ParserError<'Invalid children array in hint inner join'> : ParseEmbeddedResource<EatWhitespace<Remainder>> : ParseEmbeddedResource<EatWhitespace<Remainder>> extends [
    infer Children,
    `${infer Remainder}`
] ? Children extends Ast.Node[] ? [
    {
        type: 'field';
        name: Name;
        hint: Hint;
        children: Children;
    },
    EatWhitespace<Remainder>
] : ParserError<'Invalid children array in hint'> : ParseEmbeddedResource<EatWhitespace<Remainder>> : ParserError<`Expected identifier after "!" at \`${EatWhitespace<Remainder>}\``> : EatWhitespace<Remainder> extends `(${infer _}` ? ParseEmbeddedResource<EatWhitespace<Remainder>> extends [infer Children, `${infer Remainder}`] ? Children extends Ast.Node[] ? [
    {
        type: 'field';
        name: Name;
        children: Children;
    },
    EatWhitespace<Remainder>
] : ParserError<'Invalid children array in field'> : ParseEmbeddedResource<EatWhitespace<Remainder>> : ParseNonEmbeddedResourceField<Input> : ParserError<`Expected identifier at \`${Input}\``>;
declare type ParseCountField<Input extends string> = ParseIdentifier<Input> extends [
    'count',
    `${infer Remainder}`
] ? (EatWhitespace<Remainder> extends `()${infer Remainder_}` ? EatWhitespace<Remainder_> : EatWhitespace<Remainder>) extends `${infer Remainder}` ? Remainder extends `::${infer _}` ? ParseFieldTypeCast<Remainder> extends [infer CastType, `${infer Remainder}`] ? [
    {
        type: 'field';
        name: 'count';
        aggregateFunction: 'count';
        castType: CastType;
    },
    Remainder
] : ParseFieldTypeCast<Remainder> : [{
    type: 'field';
    name: 'count';
    aggregateFunction: 'count';
}, Remainder] : never : ParserError<`Expected "count" at \`${Input}\``>;
/**
 * Parses an embedded resource, which is an opening `(`, followed by a sequence of
 * 0 or more nodes separated by `,`, then a closing `)`.
 *
 * Returns a tuple of ["Parsed fields", "Remainder of text"], an error,
 * or the original string input indicating that no opening `(` was found.
 */
declare type ParseEmbeddedResource<Input extends string> = Input extends `(${infer Remainder}` ? EatWhitespace<Remainder> extends `)${infer Remainder}` ? [[], EatWhitespace<Remainder>] : ParseNodes<EatWhitespace<Remainder>> extends [infer Nodes, `${infer Remainder}`] ? Nodes extends Ast.Node[] ? EatWhitespace<Remainder> extends `)${infer Remainder}` ? [Nodes, EatWhitespace<Remainder>] : ParserError<`Expected ")" at \`${EatWhitespace<Remainder>}\``> : ParserError<'Invalid nodes array in embedded resource'> : ParseNodes<EatWhitespace<Remainder>> : ParserError<`Expected "(" at \`${Input}\``>;
/**
 * Parses a field excluding embedded resources, without preceding field renaming.
 * This is one of the following:
 * - `field`
 * - `field.aggregate()`
 * - `field.aggregate()::type`
 * - `field::type`
 * - `field::type.aggregate()`
 * - `field::type.aggregate()::type`
 * - `field->json...`
 * - `field->json.aggregate()`
 * - `field->json.aggregate()::type`
 * - `field->json::type`
 * - `field->json::type.aggregate()`
 * - `field->json::type.aggregate()::type`
 */
declare type ParseNonEmbeddedResourceField<Input extends string> = ParseIdentifier<Input> extends [
    infer Name,
    `${infer Remainder}`
] ? (Remainder extends `->${infer PathAndRest}` ? ParseJsonAccessor<Remainder> extends [
    infer PropertyName,
    infer PropertyType,
    `${infer Remainder}`
] ? [
    {
        type: 'field';
        name: Name;
        alias: PropertyName;
        castType: PropertyType;
        jsonPath: JsonPathToAccessor<PathAndRest extends `${infer Path},${string}` ? Path : PathAndRest>;
    },
    Remainder
] : ParseJsonAccessor<Remainder> : [{
    type: 'field';
    name: Name;
}, Remainder]) extends infer Parsed ? Parsed extends [infer Field, `${infer Remainder}`] ? (Remainder extends `::${infer _}` ? ParseFieldTypeCast<Remainder> extends [infer CastType, `${infer Remainder}`] ? [Omit<Field, 'castType'> & {
    castType: CastType;
}, Remainder] : ParseFieldTypeCast<Remainder> : [Field, Remainder]) extends infer Parsed ? Parsed extends [infer Field, `${infer Remainder}`] ? Remainder extends `.${infer _}` ? ParseFieldAggregation<Remainder> extends [
    infer AggregateFunction,
    `${infer Remainder}`
] ? Remainder extends `::${infer _}` ? ParseFieldTypeCast<Remainder> extends [infer CastType, `${infer Remainder}`] ? [
    Omit<Field, 'castType'> & {
        aggregateFunction: AggregateFunction;
        castType: CastType;
    },
    Remainder
] : ParseFieldTypeCast<Remainder> : [Field & {
    aggregateFunction: AggregateFunction;
}, Remainder] : ParseFieldAggregation<Remainder> : [Field, Remainder] : Parsed : never : Parsed : never : ParserError<`Expected identifier at \`${Input}\``>;
/**
 * Parses a JSON property accessor of the shape `->a->b->c`. The last accessor in
 * the series may convert to text by using the ->> operator instead of ->.
 *
 * Returns a tuple of ["Last property name", "Last property type", "Remainder of text"]
 */
declare type ParseJsonAccessor<Input extends string> = Input extends `->${infer Remainder}` ? Remainder extends `>${infer Remainder}` ? ParseIdentifier<Remainder> extends [infer Name, `${infer Remainder}`] ? [Name, 'text', EatWhitespace<Remainder>] : ParserError<'Expected property name after `->>`'> : ParseIdentifier<Remainder> extends [infer Name, `${infer Remainder}`] ? ParseJsonAccessor<Remainder> extends [
    infer PropertyName,
    infer PropertyType,
    `${infer Remainder}`
] ? [PropertyName, PropertyType, EatWhitespace<Remainder>] : [Name, 'json', EatWhitespace<Remainder>] : ParserError<'Expected property name after `->`'> : ParserError<'Expected ->'>;
/**
 * Parses a field typecast (`::type`), returning a tuple of ["Type", "Remainder of text"].
 */
declare type ParseFieldTypeCast<Input extends string> = EatWhitespace<Input> extends `::${infer Remainder}` ? ParseIdentifier<EatWhitespace<Remainder>> extends [`${infer CastType}`, `${infer Remainder}`] ? [CastType, EatWhitespace<Remainder>] : ParserError<`Invalid type for \`::\` operator at \`${Remainder}\``> : ParserError<'Expected ::'>;
/**
 * Parses a field aggregation (`.max()`), returning a tuple of ["Aggregate function", "Remainder of text"]
 */
declare type ParseFieldAggregation<Input extends string> = EatWhitespace<Input> extends `.${infer Remainder}` ? ParseIdentifier<EatWhitespace<Remainder>> extends [
    `${infer FunctionName}`,
    `${infer Remainder}`
] ? FunctionName extends Token.AggregateFunction ? EatWhitespace<Remainder> extends `()${infer Remainder}` ? [FunctionName, EatWhitespace<Remainder>] : ParserError<`Expected \`()\` after \`.\` operator \`${FunctionName}\``> : ParserError<`Invalid type for \`.\` operator \`${FunctionName}\``> : ParserError<`Invalid type for \`.\` operator at \`${Remainder}\``> : ParserError<'Expected .'>;
/**
 * Parses a (possibly double-quoted) identifier.
 * Identifiers are sequences of 1 or more letters.
 */
declare type ParseIdentifier<Input extends string> = ParseLetters<Input> extends [
    infer Name,
    `${infer Remainder}`
] ? [Name, EatWhitespace<Remainder>] : ParseQuotedLetters<Input> extends [infer Name, `${infer Remainder}`] ? [Name, EatWhitespace<Remainder>] : ParserError<`No (possibly double-quoted) identifier at \`${Input}\``>;
/**
 * Parse a consecutive sequence of 1 or more letter, where letters are `[0-9a-zA-Z_]`.
 */
declare type ParseLetters<Input extends string> = string extends Input ? GenericStringError : ParseLettersHelper<Input, ''> extends [`${infer Letters}`, `${infer Remainder}`] ? Letters extends '' ? ParserError<`Expected letter at \`${Input}\``> : [Letters, Remainder] : ParseLettersHelper<Input, ''>;
declare type ParseLettersHelper<Input extends string, Acc extends string> = string extends Input ? GenericStringError : Input extends `${infer L}${infer Remainder}` ? L extends Token.Letter ? ParseLettersHelper<Remainder, `${Acc}${L}`> : [Acc, Input] : [Acc, ''];
/**
 * Parse a consecutive sequence of 1 or more double-quoted letters,
 * where letters are `[^"]`.
 */
declare type ParseQuotedLetters<Input extends string> = string extends Input ? GenericStringError : Input extends `"${infer Remainder}` ? ParseQuotedLettersHelper<Remainder, ''> extends [`${infer Letters}`, `${infer Remainder}`] ? Letters extends '' ? ParserError<`Expected string at \`${Remainder}\``> : [Letters, Remainder] : ParseQuotedLettersHelper<Remainder, ''> : ParserError<`Not a double-quoted string at \`${Input}\``>;
declare type ParseQuotedLettersHelper<Input extends string, Acc extends string> = string extends Input ? GenericStringError : Input extends `${infer L}${infer Remainder}` ? L extends '"' ? [Acc, Remainder] : ParseQuotedLettersHelper<Remainder, `${Acc}${L}`> : ParserError<`Missing closing double-quote in \`"${Acc}${Input}\``>;
/**
 * Trims whitespace from the left of the input.
 */
declare type EatWhitespace<Input extends string> = string extends Input ? GenericStringError : Input extends `${Token.Whitespace}${infer Remainder}` ? EatWhitespace<Remainder> : Input;
/**
 * Creates a new {@link ParserError} if the given input is not already a parser error.
 */
declare type CreateParserErrorIfRequired<Input, Message extends string> = Input extends ParserError<string> ? Input : ParserError<Message>;
/**
 * Parser errors.
 */
export declare type ParserError<Message extends string> = {
    error: true;
} & Message;
declare type GenericStringError = ParserError<'Received a generic string'>;
export declare namespace Ast {
    type Node = FieldNode | StarNode | SpreadNode;
    type FieldNode = {
        type: 'field';
        name: string;
        alias?: string;
        hint?: string;
        innerJoin?: true;
        castType?: string;
        jsonPath?: string;
        aggregateFunction?: Token.AggregateFunction;
        children?: Node[];
    };
    type StarNode = {
        type: 'star';
    };
    type SpreadNode = {
        type: 'spread';
        target: FieldNode & {
            children: Node[];
        };
    };
}
declare namespace Token {
    export type Whitespace = ' ' | '\n' | '\t';
    type LowerAlphabet = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
    type Alphabet = LowerAlphabet | Uppercase<LowerAlphabet>;
    type Digit = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0';
    export type Letter = Alphabet | Digit | '_';
    export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';
    export {};
}
export {};
//# sourceMappingURL=parser.d.ts.map