import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoUnsafeMetricsImportsRule } from './no-unsafe-metrics-imports.js';

const root = '/repo/packages/cli/src/metrics/prometheus/';
const filename = `${root}example-metrics.service.ts`;
const ruleTester = new RuleTester();

ruleTester.run('no-unsafe-metrics-imports', NoUnsafeMetricsImportsRule, {
	valid: [
		...[
			"import { DatabaseMetricQueryService } from './database-metric-query.service';",
			"import { toGaugeValue, type CachedMetricQuery } from './cached-metric-query';",
			"import { DatabaseMetricQueryService as Queries } from '@/metrics/prometheus/database-metric-query.service.js';",
			"import type { WorkflowRepository } from '@n8n/db';",
			"import { type WorkflowRepository, WorkflowPublicationOutboxStatus } from '@n8n/db';",
			"import { Service } from '@n8n/di';",
			"import { EventService } from '@n8n/backend-services';",
			"import promClient, { Gauge } from 'prom-client';",
			"import { helper } from './helpers/example';",
			"export { helper } from './helpers/example';",
			"export * from './helpers/example';",
			"export type { WorkflowRepository } from '@n8n/db';",
		].map((code) => ({ filename, code })),
		{
			filename: `${root}database-metric-query.service.ts`,
			code: `
				import { WorkflowRepository } from '@n8n/db';
				import { CachedMetricQueryFactory } from './cached-metric-query';
			`,
		},
		{
			filename: `${root}cached-metric-query.ts`,
			code: "import { DbConnection } from '@n8n/db';",
		},
		{
			filename: `${root}db-pool-metrics.service.ts`,
			code: "import { DbConnection, DbConnectionMetrics } from '@n8n/db';",
		},
		{
			filename: `${root}prometheus.service.ts`,
			code: "import { DatabaseIndependentRoutes } from '@/services/database-independent-routes.service';",
		},
		{
			filename: `${root}event-bus-metrics.service.ts`,
			code: "import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';",
		},
		{
			filename: '/repo/packages/cli/src/workflows/example.service.ts',
			code: "import { WorkflowRepository } from '@n8n/db';",
		},
		{
			filename: 'C:\\repo\\packages\\cli\\src\\metrics\\prometheus\\example-metrics.service.ts',
			code: `
				import { DURATION_BUCKETS_SECONDS } from './constant';
				import { DatabaseMetricQueryService } from '@/metrics/prometheus/database-metric-query.service';
			`,
		},
	],
	invalid: [
		...[
			"import { WorkflowRepository } from '@n8n/db';",
			"import { WorkflowRepository as Workflows } from '@n8n/db';",
			"import { DbConnection } from '@n8n/db';",
			"import * as db from '@n8n/db';",
			"import db from '@n8n/db';",
			"import '@n8n/db';",
			"import { WorkflowRepository } from '@n8n/db/dist/repositories/workflow.repository';",
			"import { DataSource } from '@n8n/typeorm';",
			"import { Client } from 'pg';",
			"import { WorkflowService } from '@/workflows/workflow.service';",
			"import { WorkflowService } from '../../workflows/workflow.service';",
			"import { unknownService } from '@n8n/backend-services';",
			"import { Container } from '@n8n/di';",
			"import * as di from '@n8n/di';",
			"import { CachedMetricQueryFactory } from './cached-metric-query';",
			"import { CachedMetricQuery } from '@/metrics/prometheus/cached-metric-query.js';",
			"import * as queries from './cached-metric-query';",
			"import * as queries from './database-metric-query.service';",
			"import { helper } from './__tests__/helper';",
			"import { helper } from './helper.test.ts';",
			"export { WorkflowRepository as Workflows } from '@n8n/db';",
			"export {} from '@n8n/db';",
			"export * from '@n8n/db';",
			"export * from './cached-metric-query';",
		].map((code) => ({ filename, code, errors: [{ messageId: 'unsafeImport' as const }] })),
		...[
			"await import('@n8n/db');",
			'await import(moduleName);',
			"const db = require('@n8n/db');",
			"import db = require('@n8n/db');",
		].map((code) => ({ filename, code, errors: [{ messageId: 'dynamicImport' as const }] })),
		{
			filename: `${root}helpers/queries.ts`,
			code: "export { WorkflowService } from '@/workflows/workflow.service';",
			errors: [{ messageId: 'unsafeImport' }],
		},
		{
			filename: `${root}helpers/database-metric-query.service.ts`,
			code: "import { WorkflowRepository } from '@n8n/db';",
			errors: [{ messageId: 'unsafeImport' }],
		},
		{
			filename: `${root}helpers/example.ts`,
			code: "import { CachedMetricQueryFactory } from '../cached-metric-query.ts';",
			errors: [{ messageId: 'unsafeImport' }],
		},
		{
			filename: filename.replaceAll('/', '\\'),
			code: "import { WorkflowRepository } from '@n8n/db';",
			errors: [{ messageId: 'unsafeImport' }],
		},
		{
			filename: 'C:\\repo\\packages\\cli\\src\\metrics\\prometheus\\example-metrics.service.ts',
			code: "import { WorkflowService } from '../../workflows/workflow.service';",
			errors: [{ messageId: 'unsafeImport' }],
		},
	],
});
