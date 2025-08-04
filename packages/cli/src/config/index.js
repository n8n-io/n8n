'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const convict_1 = __importDefault(require('convict'));
const flat_1 = require('flat');
const fs_1 = require('fs');
const merge_1 = __importDefault(require('lodash/merge'));
const n8n_workflow_1 = require('n8n-workflow');
const node_assert_1 = __importDefault(require('node:assert'));
const constants_1 = require('@/constants');
const globalConfig = di_1.Container.get(config_1.GlobalConfig);
if (constants_1.inE2ETests) {
	globalConfig.diagnostics.enabled = false;
	globalConfig.publicApi.disabled = true;
	process.env.EXTERNAL_FRONTEND_HOOKS_URLS = '';
	process.env.N8N_PERSONALIZATION_ENABLED = 'false';
	process.env.N8N_AI_ENABLED = 'true';
} else if (backend_common_1.inTest) {
	globalConfig.logging.level = 'silent';
	globalConfig.publicApi.disabled = true;
	process.env.SKIP_STATISTICS_EVENTS = 'true';
	globalConfig.auth.cookie.secure = false;
	process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK = 'false';
}
const schema_1 = require('./schema');
const config = (0, convict_1.default)(schema_1.schema, { args: [] });
config.getEnv = config.get;
const logger = di_1.Container.get(backend_common_1.Logger);
if (!constants_1.inE2ETests && !backend_common_1.inTest) {
	const { N8N_CONFIG_FILES } = process.env;
	if (N8N_CONFIG_FILES !== undefined) {
		const configFiles = N8N_CONFIG_FILES.split(',');
		for (const configFile of configFiles) {
			if (!configFile) continue;
			try {
				const data = JSON.parse((0, fs_1.readFileSync)(configFile, 'utf8'));
				for (const prefix in data) {
					const innerData = data[prefix];
					if (prefix in globalConfig) {
						(0, merge_1.default)(globalConfig[prefix], innerData);
					} else {
						const flattenedData = (0, flat_1.flatten)(innerData);
						for (const key in flattenedData) {
							config.set(`${prefix}.${key}`, flattenedData[key]);
						}
					}
				}
				logger.debug(`Loaded config overwrites from ${configFile}`);
			} catch (error) {
				(0, node_assert_1.default)(error instanceof Error);
				logger.error(`Error loading config file ${configFile}`, { error });
			}
		}
	}
	Object.entries(process.env).forEach(([envName, fileName]) => {
		if (envName.endsWith('_FILE') && fileName) {
			const configEnvName = envName.replace(/_FILE$/, '');
			const key = config._env[configEnvName]?.[0];
			if (key) {
				let value;
				try {
					value = (0, fs_1.readFileSync)(fileName, 'utf8');
				} catch (error) {
					if (error.code === 'ENOENT') {
						throw new n8n_workflow_1.UserError('File not found', { extra: { fileName } });
					}
					throw error;
				}
				config.set(key, value);
			}
		}
	});
}
config.validate({
	allowed: 'strict',
});
const userManagement = config.get('userManagement');
if (userManagement.jwtRefreshTimeoutHours >= userManagement.jwtSessionDurationHours) {
	if (!backend_common_1.inTest)
		logger.warn(
			'N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS needs to smaller than N8N_USER_MANAGEMENT_JWT_DURATION_HOURS. Setting N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS to 0 for now.',
		);
	config.set('userManagement.jwtRefreshTimeoutHours', 0);
}
(0, n8n_workflow_1.setGlobalState)({
	defaultTimezone: globalConfig.generic.timezone,
});
exports.default = config;
//# sourceMappingURL=index.js.map
