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
exports.ExecutionsPruningService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_assert_1 = require('node:assert');
let ExecutionsPruningService = class ExecutionsPruningService {
	constructor(
		logger,
		instanceSettings,
		dbConnection,
		executionRepository,
		binaryDataService,
		executionsConfig,
	) {
		this.logger = logger;
		this.instanceSettings = instanceSettings;
		this.dbConnection = dbConnection;
		this.executionRepository = executionRepository;
		this.binaryDataService = binaryDataService;
		this.executionsConfig = executionsConfig;
		this.rates = {
			softDeletion:
				this.executionsConfig.pruneDataIntervals.softDelete *
				constants_1.Time.minutes.toMilliseconds,
			hardDeletion:
				this.executionsConfig.pruneDataIntervals.hardDelete *
				constants_1.Time.minutes.toMilliseconds,
		};
		this.batchSize = 100;
		this.isShuttingDown = false;
		this.logger = this.logger.scoped('pruning');
	}
	init() {
		(0, node_assert_1.strict)(
			this.instanceSettings.instanceRole !== 'unset',
			'Instance role is not set',
		);
		if (this.instanceSettings.isLeader) this.startPruning();
	}
	get isEnabled() {
		return (
			this.executionsConfig.pruneData &&
			this.instanceSettings.instanceType === 'main' &&
			this.instanceSettings.isLeader
		);
	}
	startPruning() {
		const { connectionState } = this.dbConnection;
		if (!this.isEnabled || !connectionState.migrated || this.isShuttingDown) return;
		this.scheduleRollingSoftDeletions();
		this.scheduleNextHardDeletion();
		this.logger.debug('Started pruning timers');
	}
	stopPruning() {
		if (!this.isEnabled) return;
		clearInterval(this.softDeletionInterval);
		clearTimeout(this.hardDeletionTimeout);
		this.logger.debug('Stopped pruning timers');
	}
	scheduleRollingSoftDeletions(rateMs = this.rates.softDeletion) {
		this.softDeletionInterval = setInterval(
			async () => await this.softDelete(),
			this.rates.softDeletion,
		);
		this.logger.debug(
			`Soft-deletion every ${rateMs * constants_1.Time.milliseconds.toMinutes} minutes`,
		);
	}
	scheduleNextHardDeletion(rateMs = this.rates.hardDeletion) {
		this.hardDeletionTimeout = setTimeout(() => {
			this.hardDelete()
				.then((rate) => this.scheduleNextHardDeletion(rate))
				.catch((error) => {
					this.scheduleNextHardDeletion(1_000);
					this.logger.error('Failed to hard-delete executions', {
						error: (0, n8n_workflow_1.ensureError)(error),
					});
				});
		}, rateMs);
		this.logger.debug(
			`Hard-deletion in next ${rateMs * constants_1.Time.milliseconds.toMinutes} minutes`,
		);
	}
	async softDelete() {
		const result = await this.executionRepository.softDeletePrunableExecutions();
		if (result.affected === 0) {
			this.logger.debug('Found no executions to soft-delete');
			return;
		}
		this.logger.debug('Soft-deleted executions', { count: result.affected });
	}
	shutdown() {
		this.isShuttingDown = true;
		this.stopPruning();
	}
	async hardDelete() {
		const ids = await this.executionRepository.findSoftDeletedExecutions();
		const executionIds = ids.map((o) => o.executionId);
		if (executionIds.length === 0) {
			this.logger.debug('Found no executions to hard-delete');
			return this.rates.hardDeletion;
		}
		try {
			await this.binaryDataService.deleteMany(ids);
			await this.executionRepository.deleteByIds(executionIds);
			this.logger.debug('Hard-deleted executions', { executionIds });
		} catch (error) {
			this.logger.error('Failed to hard-delete executions', {
				executionIds,
				error: (0, n8n_workflow_1.ensureError)(error),
			});
		}
		if (executionIds.length >= this.batchSize) return 1 * constants_1.Time.seconds.toMilliseconds;
		return this.rates.hardDeletion;
	}
};
exports.ExecutionsPruningService = ExecutionsPruningService;
__decorate(
	[
		(0, decorators_1.OnLeaderTakeover)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	ExecutionsPruningService.prototype,
	'startPruning',
	null,
);
__decorate(
	[
		(0, decorators_1.OnLeaderStepdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	ExecutionsPruningService.prototype,
	'stopPruning',
	null,
);
__decorate(
	[
		(0, decorators_1.OnShutdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	ExecutionsPruningService.prototype,
	'shutdown',
	null,
);
exports.ExecutionsPruningService = ExecutionsPruningService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.InstanceSettings,
			db_1.DbConnection,
			db_1.ExecutionRepository,
			n8n_core_1.BinaryDataService,
			config_1.ExecutionsConfig,
		]),
	],
	ExecutionsPruningService,
);
//# sourceMappingURL=executions-pruning.service.js.map
