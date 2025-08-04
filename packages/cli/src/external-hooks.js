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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExternalHooks = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
let ExternalHooks = class ExternalHooks {
	constructor(
		logger,
		errorReporter,
		globalConfig,
		userRepository,
		settingsRepository,
		credentialsRepository,
		workflowRepository,
	) {
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.globalConfig = globalConfig;
		this.registered = {};
		this.dbCollections = {
			User: userRepository,
			Settings: settingsRepository,
			Credentials: credentialsRepository,
			Workflow: workflowRepository,
		};
	}
	async init() {
		const externalHookFiles = this.globalConfig.externalHooks.files;
		for (let hookFilePath of externalHookFiles) {
			hookFilePath = hookFilePath.trim();
			try {
				const hookFile = require(hookFilePath);
				this.loadHooks(hookFile);
			} catch (e) {
				const error = e instanceof Error ? e : new Error(`${e}`);
				throw new n8n_workflow_1.UnexpectedError('Problem loading external hook file', {
					extra: { errorMessage: error.message, hookFilePath },
					cause: error,
				});
			}
		}
	}
	loadHooks(hookFileData) {
		const { registered } = this;
		for (const [resource, operations] of Object.entries(hookFileData)) {
			for (const operation of Object.keys(operations)) {
				const hookName = `${resource}.${operation}`;
				registered[hookName] ??= [];
				registered[hookName].push(...operations[operation]);
			}
		}
	}
	async run(hookName, hookParameters) {
		const { registered, dbCollections } = this;
		const hookFunctions = registered[hookName];
		if (!hookFunctions?.length) return;
		const context = { dbCollections };
		for (const hookFunction of hookFunctions) {
			try {
				await hookFunction.apply(context, hookParameters);
			} catch (cause) {
				this.logger.error(`There was a problem running hook "${hookName}"`);
				const error = new n8n_workflow_1.UnexpectedError(`External hook "${hookName}" failed`, {
					cause,
				});
				this.errorReporter.error(error, { level: 'fatal' });
				throw cause;
			}
		}
	}
};
exports.ExternalHooks = ExternalHooks;
exports.ExternalHooks = ExternalHooks = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.ErrorReporter,
			config_1.GlobalConfig,
			db_1.UserRepository,
			db_1.SettingsRepository,
			db_1.CredentialsRepository,
			db_1.WorkflowRepository,
		]),
	],
	ExternalHooks,
);
//# sourceMappingURL=external-hooks.js.map
