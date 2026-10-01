import { aiTransformToCode } from './ai-transform-to-code.migration';
import { executeWorkflowEachToLoop } from './execute-workflow-each-to-loop.migration';
import type { Migration } from './node-migration';

// All registered migrations. A rule is auto-migratable only if it appears here.
export const nodeMigrations: Migration[] = [aiTransformToCode, executeWorkflowEachToLoop];
