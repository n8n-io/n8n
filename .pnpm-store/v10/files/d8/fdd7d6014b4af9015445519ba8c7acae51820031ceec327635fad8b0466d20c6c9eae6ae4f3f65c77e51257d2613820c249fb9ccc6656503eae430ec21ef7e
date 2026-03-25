import { GenericTable } from '../types';
import { ContainsNull, GenericRelationship, PostgreSQLTypes } from './types';
import { Ast, ParseQuery } from './parser';
import { AggregateFunctions, ExtractFirstProperty, GenericSchema, IsNonEmptyArray, Prettify, TablesAndViews, TypeScriptTypes } from './types';
import { CheckDuplicateEmbededReference, GetFieldNodeResultName, IsAny, IsRelationNullable, IsStringUnion, JsonPathToType, ResolveRelationship, SelectQueryError } from './utils';
/**
 * Main entry point for constructing the result type of a PostgREST query.
 *
 * @param Schema - Database schema.
 * @param Row - The type of a row in the current table.
 * @param RelationName - The name of the current table or view.
 * @param Relationships - Relationships of the current table.
 * @param Query - The select query string literal to parse.
 */
export declare type GetResult<Schema extends GenericSchema, Row extends Record<string, unknown>, RelationName, Relationships, Query extends string> = IsAny<Schema> extends true ? ParseQuery<Query> extends infer ParsedQuery ? ParsedQuery extends Ast.Node[] ? RelationName extends string ? ProcessNodesWithoutSchema<ParsedQuery> : any : ParsedQuery : any : Relationships extends null ? ParseQuery<Query> extends infer ParsedQuery ? ParsedQuery extends Ast.Node[] ? RPCCallNodes<ParsedQuery, RelationName extends string ? RelationName : 'rpc_call', Row> : ParsedQuery : Row : ParseQuery<Query> extends infer ParsedQuery ? ParsedQuery extends Ast.Node[] ? RelationName extends string ? Relationships extends GenericRelationship[] ? ProcessNodes<Schema, Row, RelationName, Relationships, ParsedQuery> : SelectQueryError<'Invalid Relationships cannot infer result type'> : SelectQueryError<'Invalid RelationName cannot infer result type'> : ParsedQuery : never;
declare type ProcessSimpleFieldWithoutSchema<Field extends Ast.FieldNode> = Field['aggregateFunction'] extends AggregateFunctions ? {
    [K in GetFieldNodeResultName<Field>]: Field['castType'] extends PostgreSQLTypes ? TypeScriptTypes<Field['castType']> : number;
} : {
    [K in GetFieldNodeResultName<Field>]: Field['castType'] extends PostgreSQLTypes ? TypeScriptTypes<Field['castType']> : any;
};
declare type ProcessFieldNodeWithoutSchema<Node extends Ast.FieldNode> = IsNonEmptyArray<Node['children']> extends true ? {
    [K in GetFieldNodeResultName<Node>]: Node['children'] extends Ast.Node[] ? ProcessNodesWithoutSchema<Node['children']>[] : ProcessSimpleFieldWithoutSchema<Node>;
} : ProcessSimpleFieldWithoutSchema<Node>;
/**
 * Processes a single Node without schema and returns the resulting TypeScript type.
 */
declare type ProcessNodeWithoutSchema<Node extends Ast.Node> = Node extends Ast.StarNode ? any : Node extends Ast.SpreadNode ? Node['target']['children'] extends Ast.StarNode[] ? any : Node['target']['children'] extends Ast.FieldNode[] ? {
    [P in Node['target']['children'][number] as GetFieldNodeResultName<P>]: P['castType'] extends PostgreSQLTypes ? TypeScriptTypes<P['castType']> : any;
} : any : Node extends Ast.FieldNode ? ProcessFieldNodeWithoutSchema<Node> : any;
/**
 * Processes nodes when Schema is any, providing basic type inference
 */
declare type ProcessNodesWithoutSchema<Nodes extends Ast.Node[], Acc extends Record<string, unknown> = {}> = Nodes extends [infer FirstNode, ...infer RestNodes] ? FirstNode extends Ast.Node ? RestNodes extends Ast.Node[] ? ProcessNodeWithoutSchema<FirstNode> extends infer FieldResult ? FieldResult extends Record<string, unknown> ? ProcessNodesWithoutSchema<RestNodes, Acc & FieldResult> : FieldResult : any : any : any : Prettify<Acc>;
/**
 * Processes a single Node from a select chained after a rpc call
 *
 * @param Row - The type of a row in the current table.
 * @param RelationName - The name of the current rpc function
 * @param NodeType - The Node to process.
 */
export declare type ProcessRPCNode<Row extends Record<string, unknown>, RelationName extends string, NodeType extends Ast.Node> = NodeType['type'] extends Ast.StarNode['type'] ? Row : NodeType['type'] extends Ast.FieldNode['type'] ? ProcessSimpleField<Row, RelationName, Extract<NodeType, Ast.FieldNode>> : SelectQueryError<'RPC Unsupported node type.'>;
/**
 * Process select call that can be chained after an rpc call
 */
export declare type RPCCallNodes<Nodes extends Ast.Node[], RelationName extends string, Row extends Record<string, unknown>, Acc extends Record<string, unknown> = {}> = Nodes extends [infer FirstNode, ...infer RestNodes] ? FirstNode extends Ast.Node ? RestNodes extends Ast.Node[] ? ProcessRPCNode<Row, RelationName, FirstNode> extends infer FieldResult ? FieldResult extends Record<string, unknown> ? RPCCallNodes<RestNodes, RelationName, Row, Acc & FieldResult> : FieldResult extends SelectQueryError<infer E> ? SelectQueryError<E> : SelectQueryError<'Could not retrieve a valid record or error value'> : SelectQueryError<'Processing node failed.'> : SelectQueryError<'Invalid rest nodes array in RPC call'> : SelectQueryError<'Invalid first node in RPC call'> : Prettify<Acc>;
/**
 * Recursively processes an array of Nodes and accumulates the resulting TypeScript type.
 *
 * @param Schema - Database schema.
 * @param Row - The type of a row in the current table.
 * @param RelationName - The name of the current table or view.
 * @param Relationships - Relationships of the current table.
 * @param Nodes - An array of AST nodes to process.
 * @param Acc - Accumulator for the constructed type.
 */
export declare type ProcessNodes<Schema extends GenericSchema, Row extends Record<string, unknown>, RelationName extends string, Relationships extends GenericRelationship[], Nodes extends Ast.Node[], Acc extends Record<string, unknown> = {}> = CheckDuplicateEmbededReference<Schema, RelationName, Relationships, Nodes> extends false ? Nodes extends [infer FirstNode, ...infer RestNodes] ? FirstNode extends Ast.Node ? RestNodes extends Ast.Node[] ? ProcessNode<Schema, Row, RelationName, Relationships, FirstNode> extends infer FieldResult ? FieldResult extends Record<string, unknown> ? ProcessNodes<Schema, Row, RelationName, Relationships, RestNodes, Acc & FieldResult> : FieldResult extends SelectQueryError<infer E> ? SelectQueryError<E> : SelectQueryError<'Could not retrieve a valid record or error value'> : SelectQueryError<'Processing node failed.'> : SelectQueryError<'Invalid rest nodes array type in ProcessNodes'> : SelectQueryError<'Invalid first node type in ProcessNodes'> : Prettify<Acc> : Prettify<CheckDuplicateEmbededReference<Schema, RelationName, Relationships, Nodes>>;
/**
 * Processes a single Node and returns the resulting TypeScript type.
 *
 * @param Schema - Database schema.
 * @param Row - The type of a row in the current table.
 * @param RelationName - The name of the current table or view.
 * @param Relationships - Relationships of the current table.
 * @param NodeType - The Node to process.
 */
export declare type ProcessNode<Schema extends GenericSchema, Row extends Record<string, unknown>, RelationName extends string, Relationships extends GenericRelationship[], NodeType extends Ast.Node> = NodeType['type'] extends Ast.StarNode['type'] ? Row : NodeType['type'] extends Ast.SpreadNode['type'] ? ProcessSpreadNode<Schema, Row, RelationName, Relationships, Extract<NodeType, Ast.SpreadNode>> : NodeType['type'] extends Ast.FieldNode['type'] ? ProcessFieldNode<Schema, Row, RelationName, Relationships, Extract<NodeType, Ast.FieldNode>> : SelectQueryError<'Unsupported node type.'>;
/**
 * Processes a FieldNode and returns the resulting TypeScript type.
 *
 * @param Schema - Database schema.
 * @param Row - The type of a row in the current table.
 * @param RelationName - The name of the current table or view.
 * @param Relationships - Relationships of the current table.
 * @param Field - The FieldNode to process.
 */
declare type ProcessFieldNode<Schema extends GenericSchema, Row extends Record<string, unknown>, RelationName extends string, Relationships extends GenericRelationship[], Field extends Ast.FieldNode> = Field['children'] extends [] ? {} : IsNonEmptyArray<Field['children']> extends true ? ProcessEmbeddedResource<Schema, Relationships, Field, RelationName> : ProcessSimpleField<Row, RelationName, Field>;
declare type ResolveJsonPathType<Value, Path extends string | undefined, CastType extends PostgreSQLTypes> = Path extends string ? JsonPathToType<Value, Path> extends never ? TypeScriptTypes<CastType> : JsonPathToType<Value, Path> extends infer PathResult ? PathResult extends string ? PathResult : IsStringUnion<PathResult> extends true ? PathResult : CastType extends 'json' ? PathResult : TypeScriptTypes<CastType> : TypeScriptTypes<CastType> : TypeScriptTypes<CastType>;
/**
 * Processes a simple field (without embedded resources).
 *
 * @param Row - The type of a row in the current table.
 * @param RelationName - The name of the current table or view.
 * @param Field - The FieldNode to process.
 */
declare type ProcessSimpleField<Row extends Record<string, unknown>, RelationName extends string, Field extends Ast.FieldNode> = Field['name'] extends keyof Row | 'count' ? Field['aggregateFunction'] extends AggregateFunctions ? {
    [K in GetFieldNodeResultName<Field>]: Field['castType'] extends PostgreSQLTypes ? TypeScriptTypes<Field['castType']> : number;
} : {
    [K in GetFieldNodeResultName<Field>]: Field['castType'] extends PostgreSQLTypes ? ResolveJsonPathType<Row[Field['name']], Field['jsonPath'], Field['castType']> : Row[Field['name']];
} : SelectQueryError<`column '${Field['name']}' does not exist on '${RelationName}'.`>;
/**
 * Processes an embedded resource (relation).
 *
 * @param Schema - Database schema.
 * @param Row - The type of a row in the current table.
 * @param RelationName - The name of the current table or view.
 * @param Relationships - Relationships of the current table.
 * @param Field - The FieldNode to process.
 */
export declare type ProcessEmbeddedResource<Schema extends GenericSchema, Relationships extends GenericRelationship[], Field extends Ast.FieldNode, CurrentTableOrView extends keyof TablesAndViews<Schema> & string> = ResolveRelationship<Schema, Relationships, Field, CurrentTableOrView> extends infer Resolved ? Resolved extends {
    referencedTable: Pick<GenericTable, 'Row' | 'Relationships'>;
    relation: GenericRelationship & {
        match: 'refrel' | 'col' | 'fkname';
    };
    direction: string;
} ? ProcessEmbeddedResourceResult<Schema, Resolved, Field, CurrentTableOrView> : {
    [K in GetFieldNodeResultName<Field>]: Resolved;
} : {
    [K in GetFieldNodeResultName<Field>]: SelectQueryError<'Failed to resolve relationship.'> & string;
};
/**
 * Helper type to process the result of an embedded resource.
 */
declare type ProcessEmbeddedResourceResult<Schema extends GenericSchema, Resolved extends {
    referencedTable: Pick<GenericTable, 'Row' | 'Relationships'>;
    relation: GenericRelationship & {
        match: 'refrel' | 'col' | 'fkname';
    };
    direction: string;
}, Field extends Ast.FieldNode, CurrentTableOrView extends keyof TablesAndViews<Schema>> = ProcessNodes<Schema, Resolved['referencedTable']['Row'], Field['name'], Resolved['referencedTable']['Relationships'], Field['children'] extends undefined ? [] : Exclude<Field['children'], undefined> extends Ast.Node[] ? Exclude<Field['children'], undefined> : []> extends infer ProcessedChildren ? {
    [K in GetFieldNodeResultName<Field>]: Resolved['direction'] extends 'forward' ? Field extends {
        innerJoin: true;
    } ? Resolved['relation']['isOneToOne'] extends true ? ProcessedChildren : ProcessedChildren[] : Resolved['relation']['isOneToOne'] extends true ? ProcessedChildren | null : ProcessedChildren[] : Resolved['relation']['referencedRelation'] extends CurrentTableOrView ? Resolved['relation']['match'] extends 'col' ? IsRelationNullable<TablesAndViews<Schema>[CurrentTableOrView], Resolved['relation']> extends true ? ProcessedChildren | null : ProcessedChildren : ProcessedChildren[] : IsRelationNullable<TablesAndViews<Schema>[CurrentTableOrView], Resolved['relation']> extends true ? Field extends {
        innerJoin: true;
    } ? ProcessedChildren : ProcessedChildren | null : ProcessedChildren;
} : {
    [K in GetFieldNodeResultName<Field>]: SelectQueryError<'Failed to process embedded resource nodes.'> & string;
};
/**
 * Processes a SpreadNode by processing its target node.
 *
 * @param Schema - Database schema.
 * @param Row - The type of a row in the current table.
 * @param RelationName - The name of the current table or view.
 * @param Relationships - Relationships of the current table.
 * @param Spread - The SpreadNode to process.
 */
declare type ProcessSpreadNode<Schema extends GenericSchema, Row extends Record<string, unknown>, RelationName extends string, Relationships extends GenericRelationship[], Spread extends Ast.SpreadNode> = ProcessNode<Schema, Row, RelationName, Relationships, Spread['target']> extends infer Result ? Result extends SelectQueryError<infer E> ? SelectQueryError<E> : ExtractFirstProperty<Result> extends unknown[] ? {
    [K in Spread['target']['name']]: SelectQueryError<`"${RelationName}" and "${Spread['target']['name']}" do not form a many-to-one or one-to-one relationship spread not possible`>;
} : ProcessSpreadNodeResult<Result> : never;
/**
 * Helper type to process the result of a spread node.
 */
declare type ProcessSpreadNodeResult<Result> = Result extends Record<string, SelectQueryError<string> | null> ? Result : ExtractFirstProperty<Result> extends infer SpreadedObject ? ContainsNull<SpreadedObject> extends true ? Exclude<{
    [K in keyof SpreadedObject]: SpreadedObject[K] | null;
}, null> : Exclude<{
    [K in keyof SpreadedObject]: SpreadedObject[K];
}, null> : SelectQueryError<'An error occurred spreading the object'>;
export {};
//# sourceMappingURL=result.d.ts.map