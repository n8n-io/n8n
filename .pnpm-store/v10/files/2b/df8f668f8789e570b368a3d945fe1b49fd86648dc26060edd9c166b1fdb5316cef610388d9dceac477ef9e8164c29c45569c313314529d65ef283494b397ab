import { FieldPacket, QueryResult } from '../../packets/index.js';
import { QueryOptions, QueryableConstructor } from '../Query.js';

export declare function ExecutableBase<T extends QueryableConstructor>(
  Base?: T
): {
  new (...args: any[]): {
    execute<T extends QueryResult>(sql: string): Promise<[T, FieldPacket[]]>;
    execute<T extends QueryResult>(
      sql: string,
      values: any
    ): Promise<[T, FieldPacket[]]>;
    execute<T extends QueryResult>(
      options: QueryOptions
    ): Promise<[T, FieldPacket[]]>;
    execute<T extends QueryResult>(
      options: QueryOptions,
      values: any
    ): Promise<[T, FieldPacket[]]>;
  };
} & T;
