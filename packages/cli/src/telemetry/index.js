'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
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
exports.Telemetry = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const axios_1 = __importDefault(require('axios'));
const n8n_core_1 = require('n8n-core');
const constants_1 = require('@/constants');
const license_1 = require('@/license');
const posthog_1 = require('@/posthog');
const source_control_preferences_service_ee_1 = require('../environments.ee/source-control/source-control-preferences.service.ee');
let Telemetry = class Telemetry {
	constructor(logger, postHog, license, instanceSettings, workflowRepository, globalConfig) {
		this.logger = logger;
		this.postHog = postHog;
		this.license = license;
		this.instanceSettings = instanceSettings;
		this.workflowRepository = workflowRepository;
		this.globalConfig = globalConfig;
		this.executionCountsBuffer = {};
	}
	async init() {
		const { enabled, backendConfig } = this.globalConfig.diagnostics;
		if (enabled) {
			const [key, dataPlaneUrl] = backendConfig.split(';');
			if (!key || !dataPlaneUrl) {
				this.logger.warn('Diagnostics backend config is invalid');
				return;
			}
			const logLevel = this.globalConfig.logging.level;
			const { default: RudderStack } = await Promise.resolve().then(() =>
				__importStar(require('@rudderstack/rudder-sdk-node')),
			);
			const axiosInstance = axios_1.default.create();
			axiosInstance.interceptors.request.use((cfg) => {
				cfg.headers.setContentType('application/json', false);
				return cfg;
			});
			this.rudderStack = new RudderStack(key, {
				axiosInstance,
				logLevel,
				dataPlaneUrl,
				gzip: false,
			});
			this.startPulse();
		}
	}
	startPulse() {
		this.pulseIntervalReference = setInterval(
			async () => {
				void this.pulse();
			},
			6 * 60 * 60 * 1000,
		);
	}
	async pulse() {
		if (!this.rudderStack) {
			return;
		}
		const workflowIdsToReport = Object.keys(this.executionCountsBuffer).filter((workflowId) => {
			const data = this.executionCountsBuffer[workflowId];
			const sum =
				(data.manual_error?.count ?? 0) +
				(data.manual_success?.count ?? 0) +
				(data.prod_error?.count ?? 0) +
				(data.prod_success?.count ?? 0);
			return sum > 0;
		});
		for (const workflowId of workflowIdsToReport) {
			this.track('Workflow execution count', {
				event_version: '2',
				workflow_id: workflowId,
				...this.executionCountsBuffer[workflowId],
			});
		}
		this.executionCountsBuffer = {};
		const sourceControlPreferences = di_1.Container.get(
			source_control_preferences_service_ee_1.SourceControlPreferencesService,
		).getPreferences();
		const pulsePacket = {
			plan_name_current: this.license.getPlanName(),
			quota: this.license.getTriggerLimit(),
			usage: await this.workflowRepository.getActiveTriggerCount(),
			role_count: await di_1.Container.get(db_1.UserRepository).countUsersByRole(),
			source_control_set_up: di_1.Container.get(
				source_control_preferences_service_ee_1.SourceControlPreferencesService,
			).isSourceControlSetup(),
			branchName: sourceControlPreferences.branchName,
			read_only_instance: sourceControlPreferences.branchReadOnly,
			team_projects: (await di_1.Container.get(db_1.ProjectRepository).getProjectCounts()).team,
			project_role_count: await di_1.Container.get(
				db_1.ProjectRelationRepository,
			).countUsersByRole(),
		};
		this.track('pulse', pulsePacket);
	}
	trackWorkflowExecution(properties) {
		if (this.rudderStack) {
			const execTime = new Date();
			const workflowId = properties.workflow_id;
			this.executionCountsBuffer[workflowId] = this.executionCountsBuffer[workflowId] ?? {
				user_id: properties.user_id,
			};
			const key = `${properties.is_manual ? 'manual' : 'prod'}_${properties.success ? 'success' : 'error'}`;
			const executionTrackDataKey = this.executionCountsBuffer[workflowId][key];
			if (!executionTrackDataKey) {
				this.executionCountsBuffer[workflowId][key] = {
					count: 1,
					first: execTime,
				};
			} else {
				executionTrackDataKey.count++;
			}
			if (
				!properties.success &&
				properties.is_manual &&
				properties.error_node_type?.startsWith('n8n-nodes-base')
			) {
				this.track('Workflow execution errored', properties);
			}
		}
	}
	async stopTracking() {
		clearInterval(this.pulseIntervalReference);
		await Promise.all([this.postHog.stop(), this.rudderStack?.flush()]);
	}
	identify(traits) {
		if (!this.rudderStack) {
			return;
		}
		const { instanceId } = this.instanceSettings;
		this.rudderStack.identify({
			userId: instanceId,
			traits: { ...traits, instanceId },
			context: {
				ip: '0.0.0.0',
			},
		});
	}
	track(eventName, properties = {}) {
		if (!this.rudderStack) {
			return;
		}
		const { instanceId } = this.instanceSettings;
		const { user_id } = properties;
		const updatedProperties = {
			...properties,
			instance_id: instanceId,
			version_cli: constants_1.N8N_VERSION,
		};
		const payload = {
			userId: `${instanceId}${user_id ? `#${user_id}` : ''}`,
			event: eventName,
			properties: updatedProperties,
			context: {},
		};
		return this.rudderStack.track({
			...payload,
			context: { ...payload.context, ip: '0.0.0.0' },
		});
	}
	getCountsBuffer() {
		return this.executionCountsBuffer;
	}
};
exports.Telemetry = Telemetry;
__decorate(
	[
		(0, decorators_1.OnShutdown)(constants_1.LOWEST_SHUTDOWN_PRIORITY),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	Telemetry.prototype,
	'stopTracking',
	null,
);
exports.Telemetry = Telemetry = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			posthog_1.PostHogClient,
			license_1.License,
			n8n_core_1.InstanceSettings,
			db_1.WorkflowRepository,
			config_1.GlobalConfig,
		]),
	],
	Telemetry,
);
//# sourceMappingURL=index.js.map
