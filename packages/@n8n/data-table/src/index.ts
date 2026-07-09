// Public API of the data-table module. The `@BackendModule` entrypoint lives in
// `./data-table.module` (loaded via the `./module` export) and is intentionally
// NOT re-exported here — nor are the controllers — so importing this barrel for a
// repository/service/entity never triggers route registration as a side effect.

export * from './data-table-cli-bridge';

// Entities
export * from './data-table.entity';
export * from './data-table-column.entity';

// Repositories
export * from './data-table.repository';
export * from './data-table-column.repository';
export * from './data-table-rows.repository';

// Services
export * from './data-table.service';
export * from './data-table-aggregate.service';
export * from './data-table-proxy.service';
export * from './data-table-ddl.service';
export * from './data-table-csv-import.service';
export * from './data-table-size-validator.service';
export * from './data-table-file-cleanup.service';
export * from './csv-parser.service';

// Types
export * from './data-table.types';
export * from './types';

// Utils
export * from './utils/sql-utils';
export * from './utils/size-utils';

// Errors
export * from './errors/response.error';
export * from './errors/data-table-not-found.error';
export * from './errors/data-table-column-not-found.error';
export * from './errors/data-table-name-conflict.error';
export * from './errors/data-table-column-name-conflict.error';
export * from './errors/data-table-system-column-name-conflict.error';
export * from './errors/data-table-validation.error';
export * from './errors/data-table-file-upload.error';
