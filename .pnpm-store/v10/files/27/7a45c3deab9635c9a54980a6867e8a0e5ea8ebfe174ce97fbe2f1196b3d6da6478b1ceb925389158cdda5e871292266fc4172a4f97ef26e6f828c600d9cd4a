import type * as graphqlTypes from 'graphql';
import * as api from '@opentelemetry/api';
import { ObjectWithGraphQLData, OtelPatched, Maybe } from './internal-types';
import { GraphQLInstrumentationParsedConfig } from './types';
export declare const isPromise: (value: any) => value is Promise<unknown>;
export declare function addInputVariableAttributes(span: api.Span, variableValues: {
    [key: string]: any;
}): void;
export declare function addSpanSource(span: api.Span, loc?: graphqlTypes.Location, allowValues?: boolean, start?: number, end?: number): void;
export declare function endSpan(span: api.Span, error?: Error): void;
export declare function getOperation(document: graphqlTypes.DocumentNode, operationName?: Maybe<string>): graphqlTypes.DefinitionNode | undefined;
export declare function getSourceFromLocation(loc?: graphqlTypes.Location, allowValues?: boolean, inputStart?: number, inputEnd?: number): string;
export declare function wrapFields(type: Maybe<graphqlTypes.GraphQLObjectType & OtelPatched>, tracer: api.Tracer, getConfig: () => GraphQLInstrumentationParsedConfig): void;
export declare function wrapFieldResolver<TSource = any, TContext = any, TArgs = any>(tracer: api.Tracer, getConfig: () => GraphQLInstrumentationParsedConfig, fieldResolver: Maybe<graphqlTypes.GraphQLFieldResolver<TSource, TContext, TArgs> & OtelPatched>, isDefaultResolver?: boolean): graphqlTypes.GraphQLFieldResolver<TSource, TContext & ObjectWithGraphQLData, TArgs> & OtelPatched;
//# sourceMappingURL=utils.d.ts.map