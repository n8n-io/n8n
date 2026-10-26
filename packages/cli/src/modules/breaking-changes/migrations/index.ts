import { nodeRemovalMigrations } from './node-removals';
import type { Migration } from './node-migration';

// All registered migrations, grouped by the kind of breaking change they handle.
export const nodeMigrations: Migration[] = [...nodeRemovalMigrations];
