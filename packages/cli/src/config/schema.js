'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.schema = void 0;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
exports.schema = {
	executions: {
		mode: {
			doc: 'If it should run executions directly or via queue',
			format: ['regular', 'queue'],
			default: 'regular',
			env: 'EXECUTIONS_MODE',
		},
		concurrency: {
			productionLimit: {
				doc: "Max production executions allowed to run concurrently, in main process for regular mode and in worker for queue mode. Default for main mode is `-1` (disabled). Default for queue mode is taken from the worker's `--concurrency` flag.",
				format: Number,
				default: -1,
				env: 'N8N_CONCURRENCY_PRODUCTION_LIMIT',
			},
			evaluationLimit: {
				doc: 'Max evaluation executions allowed to run concurrently.',
				format: Number,
				default: -1,
				env: 'N8N_CONCURRENCY_EVALUATION_LIMIT',
			},
		},
		timeout: {
			doc: 'Max run time (seconds) before stopping the workflow execution',
			format: Number,
			default: -1,
			env: 'EXECUTIONS_TIMEOUT',
		},
		maxTimeout: {
			doc: 'Max execution time (seconds) that can be set for a workflow individually',
			format: Number,
			default: 3600,
			env: 'EXECUTIONS_TIMEOUT_MAX',
		},
		saveDataOnError: {
			doc: 'What workflow execution data to save on error',
			format: ['all', 'none'],
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_ERROR',
		},
		saveDataOnSuccess: {
			doc: 'What workflow execution data to save on success',
			format: ['all', 'none'],
			default: 'all',
			env: 'EXECUTIONS_DATA_SAVE_ON_SUCCESS',
		},
		saveExecutionProgress: {
			doc: 'Whether or not to save progress for each node executed',
			format: Boolean,
			default: false,
			env: 'EXECUTIONS_DATA_SAVE_ON_PROGRESS',
		},
		saveDataManualExecutions: {
			doc: 'Save data of executions when started manually via editor',
			format: Boolean,
			default: true,
			env: 'EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS',
		},
		queueRecovery: {
			interval: {
				doc: 'How often (minutes) to check for queue recovery',
				format: Number,
				default: 180,
				env: 'N8N_EXECUTIONS_QUEUE_RECOVERY_INTERVAL',
			},
			batchSize: {
				doc: 'Size of batch of executions to check for queue recovery',
				format: Number,
				default: 100,
				env: 'N8N_EXECUTIONS_QUEUE_RECOVERY_BATCH',
			},
		},
	},
	userManagement: {
		jwtSecret: {
			doc: 'Set a specific JWT secret (optional - n8n can generate one)',
			format: String,
			default: '',
			env: 'N8N_USER_MANAGEMENT_JWT_SECRET',
		},
		jwtSessionDurationHours: {
			doc: 'Set a specific expiration date for the JWTs in hours.',
			format: Number,
			default: 168,
			env: 'N8N_USER_MANAGEMENT_JWT_DURATION_HOURS',
		},
		jwtRefreshTimeoutHours: {
			doc: 'How long before the JWT expires to automatically refresh it. 0 means 25% of N8N_USER_MANAGEMENT_JWT_DURATION_HOURS. -1 means it will never refresh, which forces users to login again after the defined period in N8N_USER_MANAGEMENT_JWT_DURATION_HOURS.',
			format: Number,
			default: 0,
			env: 'N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS',
		},
		isInstanceOwnerSetUp: {
			doc: "Whether the instance owner's account has been set up",
			format: Boolean,
			default: false,
		},
		authenticationMethod: {
			doc: 'How to authenticate users (e.g. "email", "ldap", "saml")',
			format: ['email', 'ldap', 'saml'],
			default: 'email',
		},
	},
	endpoints: {
		rest: {
			format: String,
			default: di_1.Container.get(config_1.GlobalConfig).endpoints.rest,
		},
	},
	ai: {
		enabled: {
			format: Boolean,
			default: di_1.Container.get(config_1.GlobalConfig).ai.enabled,
		},
	},
};
//# sourceMappingURL=schema.js.map
