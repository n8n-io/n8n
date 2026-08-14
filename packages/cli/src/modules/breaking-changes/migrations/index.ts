import { aiTransformToCode } from './ai-transform-to-code.migration';
import type { NodeMigration } from './node-migration';

// All registered node migrations. A rule is auto-migratable only if it appears here.
export const nodeMigrations: NodeMigration[] = [aiTransformToCode];
