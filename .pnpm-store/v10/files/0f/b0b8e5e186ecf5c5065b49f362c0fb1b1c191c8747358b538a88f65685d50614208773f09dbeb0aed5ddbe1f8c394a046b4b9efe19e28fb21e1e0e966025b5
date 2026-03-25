import { FieldPacket, QueryResult } from '../../packets/index.js';
import { QueryOptions, QueryableConstructor } from '../Query.js';

export declare function QueryableBase<T extends QueryableConstructor>(
  Base?: T
): {
  new (...args: any[]): {
    query<T extends QueryResult>(sql: string): Promise<[T, FieldPacket[]]>;
    query<T extends QueryResult>(
      sql: string,
      values: any
    ): Promise<[T, FieldPacket[]]>;
    query<T extends QueryResult>(
      options: QueryOptions
    ): Promise<[T, FieldPacket[]]>;
    query<T extends QueryResult>(
      options: QueryOptions,
      values: any
    ): Promise<[T, FieldPacket[]]>;
  };
} & T;
