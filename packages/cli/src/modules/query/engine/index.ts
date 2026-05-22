// Public surface of the query engine.
//
// Boundary discipline: files under engine/ should only import from other engine/
// files. The compiler and executor (when added) may import from @n8n/typeorm
// — that's the one deliberate, narrow leak. Everything else stays pure.

export type * from './ast';
export * from './errors';
export type * from './ir';
export type * from './schema-map';
