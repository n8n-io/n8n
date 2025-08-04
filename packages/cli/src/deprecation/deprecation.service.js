'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.DeprecationService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const config_2 = __importDefault(require('@/config'));
const SAFE_TO_REMOVE = 'Remove this environment variable; it is no longer needed.';
let DeprecationService = class DeprecationService {
	constructor(logger, globalConfig, instanceSettings) {
		this.logger = logger;
		this.globalConfig = globalConfig;
		this.instanceSettings = instanceSettings;
		this.deprecations = [
			{ envVar: 'N8N_BINARY_DATA_TTL', message: SAFE_TO_REMOVE },
			{ envVar: 'N8N_PERSISTED_BINARY_DATA_TTL', message: SAFE_TO_REMOVE },
			{ envVar: 'EXECUTIONS_DATA_PRUNE_TIMEOUT', message: SAFE_TO_REMOVE },
			{
				envVar: 'N8N_BINARY_DATA_MODE',
				message: '`default` is deprecated. Please switch to `filesystem` mode.',
				checkValue: (value) => value === 'default',
			},
			{ envVar: 'N8N_CONFIG_FILES', message: 'Please use .env files or *_FILE env vars instead.' },
			{
				envVar: 'DB_TYPE',
				message: 'MySQL and MariaDB are deprecated. Please migrate to PostgreSQL.',
				checkValue: (value) => ['mysqldb', 'mariadb'].includes(value),
			},
			{
				envVar: 'N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN',
				message: `n8n no longer deregisters webhooks at startup and shutdown. ${SAFE_TO_REMOVE}`,
			},
			{
				envVar: 'N8N_RUNNERS_ENABLED',
				message:
					'Running n8n without task runners is deprecated. Task runners will be turned on by default in a future version. Please set `N8N_RUNNERS_ENABLED=true` to enable task runners now and avoid potential issues in the future. Learn more: https://docs.n8n.io/hosting/configuration/task-runners/',
				checkValue: (value) => value?.toLowerCase() !== 'true' && value !== '1',
				warnIfMissing: true,
				disableIf: () => this.globalConfig.nodes.exclude.includes('n8n-nodes-base.code'),
			},
			{
				envVar: 'OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS',
				message:
					'Running manual executions in the main instance in scaling mode is deprecated. Manual executions will be routed to workers in a future version. Please set `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true` to offload manual executions to workers and avoid potential issues in the future. Consider increasing memory available to workers and reducing memory available to main.',
				checkValue: (value) => value?.toLowerCase() !== 'true' && value !== '1',
				warnIfMissing: true,
				matchConfig: config_2.default.getEnv('executions.mode') === 'queue',
				disableIf: () => this.instanceSettings.instanceType !== 'main',
			},
			{
				envVar: 'N8N_PARTIAL_EXECUTION_VERSION_DEFAULT',
				checkValue: (value) => value === '1',
				message:
					'Version 1 of partial executions is deprecated and will be removed as early as v1.85.0',
			},
			{
				envVar: 'N8N_PARTIAL_EXECUTION_VERSION_DEFAULT',
				message: 'This environment variable is internal and should not be set.',
			},
			{
				envVar: 'N8N_EXPRESSION_EVALUATOR',
				message: `n8n has replaced \`tmpl\` with \`tournament\` as expression evaluator. ${SAFE_TO_REMOVE}`,
			},
			{
				envVar: 'N8N_EXPRESSION_REPORT_DIFFERENCE',
				message: `n8n has replaced \`tmpl\` with \`tournament\` as expression evaluator. ${SAFE_TO_REMOVE}`,
			},
			{
				envVar: 'EXECUTIONS_PROCESS',
				message: SAFE_TO_REMOVE,
				checkValue: (value) => value !== undefined && value !== 'own',
			},
			{
				envVar: 'EXECUTIONS_PROCESS',
				message:
					'n8n does not support `own` mode since May 2023. Please remove this environment variable to allow n8n to start. If you need the isolation and performance gains, please consider queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/',
				checkValue: (value) => value === 'own',
			},
		];
		this.state = new Map();
	}
	warn() {
		this.deprecations.forEach((d) => {
			if (d.disableIf?.()) {
				this.state.set(d, { mustWarn: false });
				return;
			}
			const envValue = process.env[d.envVar];
			const matchConfig = d.matchConfig === true || d.matchConfig === undefined;
			const warnIfMissing = d.warnIfMissing !== undefined && envValue === undefined;
			const checkValue = d.checkValue ? d.checkValue(envValue) : envValue !== undefined;
			this.state.set(d, {
				mustWarn: matchConfig && (warnIfMissing || checkValue),
			});
		});
		const mustWarn = [];
		for (const [deprecation, metadata] of this.state.entries()) {
			if (!metadata.mustWarn) {
				continue;
			}
			mustWarn.push(deprecation);
		}
		if (mustWarn.length === 0) return;
		const header = `There ${mustWarn.length === 1 ? 'is a deprecation' : 'are deprecations'} related to your environment variables. Please take the recommended actions to update your configuration`;
		const deprecations = mustWarn
			.map(({ envVar, message }) => ` - ${envVar} -> ${message}\n`)
			.join('');
		this.logger.warn(`\n${header}:\n${deprecations}`);
	}
};
exports.DeprecationService = DeprecationService;
exports.DeprecationService = DeprecationService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			config_1.GlobalConfig,
			n8n_core_1.InstanceSettings,
		]),
	],
	DeprecationService,
);
//# sourceMappingURL=deprecation.service.js.map
