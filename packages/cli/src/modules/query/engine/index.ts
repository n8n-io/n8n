// Public surface of the query engine.
//
// Boundary discipline: files under engine/ should only import from other engine/
// files. The compiler and executor (when added) may import from @n8n/typeorm
// — that's the one deliberate, narrow leak. Everything else stays pure.

export * from './ast';
export * from './errors';
export * from './ir';
export * from './schema-map';
