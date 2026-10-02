import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { posix } from 'node:path';

// New runtime dependencies need review because services can query the database indirectly.
const ALLOWED_IMPORTS: Record<string, readonly string[]> = {
	'@n8n/backend-common': ['Logger'],
	'@n8n/backend-network': ['InMemoryDnsCache', 'SsrfProtectionService'],
	'@n8n/backend-services': ['CacheService', 'EventService'],
	'@n8n/config': [
		'DatabaseConfig',
		'EndpointsConfig',
		'ExecutionsConfig',
		'PrometheusMetricsConfig',
		'SsrfProtectionConfig',
		'WorkflowsConfig',
	],
	'@n8n/constants': ['Time'],
	'@n8n/db': ['DbConnectionMetrics', 'WorkflowPublicationOutboxStatus'],
	'@n8n/decorators': ['OnLeaderStepdown', 'OnLeaderTakeover'],
	'@n8n/di': ['Service'],
	'n8n-core': ['Cipher', 'InstanceSettings', 'StorageConfig', 'TriggersAndPollers'],
	'n8n-workflow': ['assert', 'EventMessageTypeNames'],
	'node:fs': ['readFileSync'],
	'prom-client': ['default', 'Counter', 'Gauge'],
	'express-prom-bundle': ['default'],
	luxon: ['DateTime'],
	'semver/functions/parse': ['default'],
};

const FILE_IMPORTS: Record<string, Record<string, readonly string[]>> = {
	'database-metric-query.service.ts': {
		'@n8n/constants': ['ScheduledJobOwnerType'],
		'@n8n/db': [
			'WorkflowRepository',
			'LicenseMetricsRepository',
			'WorkflowPublicationOutboxRepository',
			'ScheduledTaskRepository',
			'ScheduledJobRepository',
		],
	},
	'cached-metric-query.ts': { '@n8n/db': ['DbConnection'] },
	// Pool statistics read connection state in memory. They do not execute queries.
	'db-pool-metrics.service.ts': { '@n8n/db': ['DbConnection'] },
	'event-bus-metrics.service.ts': {
		'@/eventbus/message-event-bus/message-event-bus': ['MessageEventBus'],
	},
	'instance-ai-metrics.service.ts': {
		'@/modules/instance-ai/instance-ai-run-probe': ['InstanceAiRunProbe'],
	},
	'prometheus.service.ts': {
		'@/services/database-independent-routes.service': ['DatabaseIndependentRoutes'],
	},
	'system-task-metrics.service.ts': {
		'@/events/maps/system-task-metrics.event-map': ['SYSTEM_TASK_SKIP_REASONS'],
	},
	'version-metrics.service.ts': { '@/constants': ['N8N_VERSION'] },
};

export const NoUnsafeMetricsImportsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: { description: 'Keep metrics database reads behind DatabaseMetricQueryService.' },
		schema: [],
		messages: {
			unsafeImport:
				'Runtime import "{{name}}" from "{{source}}" is not allowed in metrics. Use DatabaseMetricQueryService for database reads. Review other dependencies before adding them to the metrics allowlist.',
			dynamicImport:
				'Use a static import in metrics so the database boundary can check the dependency.',
		},
	},
	defaultOptions: [],
	create(context) {
		const posixFilename = context.filename.replaceAll('\\', '/');
		// posix.resolve treats a drive-letter path such as C:/repo as relative.
		const filename = posixFilename.startsWith('/') ? posixFilename : `/${posixFilename}`;
		const boundary = '/src/metrics/prometheus/';
		const index = filename.lastIndexOf(boundary);
		if (index === -1) return {};
		const root = filename.slice(0, index + boundary.length - 1);
		const file = posix.relative(root, filename);

		const isAllowed = (source: string, name: string) => {
			if (ALLOWED_IMPORTS[source]?.includes(name) || FILE_IMPORTS[file]?.[source]?.includes(name)) {
				return true;
			}

			const resolved = source.startsWith('@/')
				? posix.resolve(root, '../..', source.slice(2))
				: source.startsWith('.') || source.startsWith('/')
					? posix.resolve(posix.dirname(filename), source)
					: undefined;
			if (!resolved?.startsWith(`${root}/`)) return false;

			const local = posix.relative(root, resolved).replace(/\.[cm]?[jt]s$/, '');
			if (local.split('/').includes('__tests__') || /\.(test|spec)$/.test(local)) return false;
			if (local === 'cached-metric-query') {
				return (
					name === 'toGaugeValue' ||
					(file === 'database-metric-query.service.ts' && name === 'CachedMetricQueryFactory')
				);
			}
			if (local === 'database-metric-query.service') return name === 'DatabaseMetricQueryService';

			// Local helpers are subject to the same rule, including their re-exports.
			return true;
		};

		const check = (node: TSESTree.Node, source: string, name: string) => {
			if (!isAllowed(source, name)) {
				context.report({ node, messageId: 'unsafeImport', data: { source, name } });
			}
		};

		return {
			ImportDeclaration(node) {
				if (node.importKind === 'type') return;
				if (node.specifiers.length === 0) check(node, node.source.value, '(side effect)');
				for (const specifier of node.specifiers) {
					if (specifier.type === 'ImportSpecifier') {
						if (specifier.importKind === 'type') continue;
						const name =
							specifier.imported.type === 'Identifier'
								? specifier.imported.name
								: specifier.imported.value;
						check(specifier, node.source.value, name);
					} else {
						check(
							specifier,
							node.source.value,
							specifier.type === 'ImportDefaultSpecifier' ? 'default' : '*',
						);
					}
				}
			},
			ExportNamedDeclaration(node) {
				if (!node.source || node.exportKind === 'type') return;
				if (node.specifiers.length === 0) check(node, node.source.value, '(side effect)');
				for (const specifier of node.specifiers) {
					if (specifier.exportKind === 'type') continue;
					const name =
						specifier.local.type === 'Identifier' ? specifier.local.name : specifier.local.value;
					check(specifier, node.source.value, name);
				}
			},
			ExportAllDeclaration(node) {
				if (node.exportKind !== 'type') check(node, node.source.value, '*');
			},
			ImportExpression(node) {
				context.report({ node, messageId: 'dynamicImport' });
			},
			TSImportEqualsDeclaration(node) {
				context.report({ node, messageId: 'dynamicImport' });
			},
			CallExpression(node) {
				if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
					context.report({ node, messageId: 'dynamicImport' });
				}
			},
		};
	},
});
