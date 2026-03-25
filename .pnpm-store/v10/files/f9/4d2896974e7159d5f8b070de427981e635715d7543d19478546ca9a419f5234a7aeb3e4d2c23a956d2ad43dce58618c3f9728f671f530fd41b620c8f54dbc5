import { FieldPacket, QueryResult } from '../packets/index.js';
import {
  Query,
  QueryError,
  QueryOptions,
  QueryableConstructor,
} from './Query.js';

export declare function QueryableBase<T extends QueryableConstructor>(
  Base?: T
): {
  new (...args: any[]): {
    query<T extends QueryResult>(
      sql: string,
      callback?:
        | ((err: QueryError | null, result: T, fields: FieldPacket[]) => any)
        | undefined
    ): Query;
    query<T extends QueryResult>(
      sql: string,
      values: any,
      callback?:
        | ((err: QueryError | null, result: T, fields: FieldPacket[]) => any)
        | undefined
    ): Query;
    query<T extends QueryResult>(
      options: QueryOptions,
      callback?:
        | ((err: QueryError | null, result: T, fields?: FieldPacket[]) => any)
        | undefined
    ): Query;
    query<T extends QueryResult>(
      options: QueryOptions,
      values: any,
      callback?:
        | ((err: QueryError | null, result: T, fields: FieldPacket[]) => any)
        | undefined
    ): Query;
  };
} & T;
