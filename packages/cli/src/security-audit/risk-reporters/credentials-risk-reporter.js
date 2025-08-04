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
exports.CredentialsRiskReporter = void 0;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const constants_1 = require('@/security-audit/constants');
let CredentialsRiskReporter = class CredentialsRiskReporter {
	constructor(credentialsRepository, executionRepository, executionDataRepository, securityConfig) {
		this.credentialsRepository = credentialsRepository;
		this.executionRepository = executionRepository;
		this.executionDataRepository = executionDataRepository;
		this.securityConfig = securityConfig;
	}
	async report(workflows) {
		const days = this.securityConfig.daysAbandonedWorkflow;
		const allExistingCreds = await this.getAllExistingCreds();
		const { credsInAnyUse, credsInActiveUse } = await this.getAllCredsInUse(workflows);
		const recentlyExecutedCreds = await this.getCredsInRecentlyExecutedWorkflows(days);
		const credsNotInAnyUse = allExistingCreds.filter((c) => !credsInAnyUse.has(c.id));
		const credsNotInActiveUse = allExistingCreds.filter((c) => !credsInActiveUse.has(c.id));
		const credsNotRecentlyExecuted = allExistingCreds.filter(
			(c) => !recentlyExecutedCreds.has(c.id),
		);
		const issues = [credsNotInAnyUse, credsNotInActiveUse, credsNotRecentlyExecuted];
		if (issues.every((i) => i.length === 0)) return null;
		const report = {
			risk: constants_1.CREDENTIALS_REPORT.RISK,
			sections: [],
		};
		const hint = 'Keeping unused credentials in your instance is an unneeded security risk.';
		const recommendation = 'Consider deleting these credentials if you no longer need them.';
		const sentenceStart = ({ length }) =>
			length > 1 ? 'These credentials are' : 'This credential is';
		if (credsNotInAnyUse.length > 0) {
			report.sections.push({
				title: constants_1.CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ANY_USE,
				description: [sentenceStart(credsNotInAnyUse), 'not used in any workflow.', hint].join(' '),
				recommendation,
				location: credsNotInAnyUse,
			});
		}
		if (credsNotInActiveUse.length > 0) {
			report.sections.push({
				title: constants_1.CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ACTIVE_USE,
				description: [
					sentenceStart(credsNotInActiveUse),
					'not used in active workflows.',
					hint,
				].join(' '),
				recommendation,
				location: credsNotInActiveUse,
			});
		}
		if (credsNotRecentlyExecuted.length > 0) {
			report.sections.push({
				title: constants_1.CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_RECENTLY_EXECUTED,
				description: [
					sentenceStart(credsNotRecentlyExecuted),
					`not used in recently executed workflows, i.e. workflows executed in the past ${days} days.`,
					hint,
				].join(' '),
				recommendation,
				location: credsNotRecentlyExecuted,
			});
		}
		return report;
	}
	async getAllCredsInUse(workflows) {
		const credsInAnyUse = new Set();
		const credsInActiveUse = new Set();
		workflows.forEach((workflow) => {
			workflow.nodes.forEach((node) => {
				if (!node.credentials) return;
				Object.values(node.credentials).forEach((cred) => {
					if (!cred?.id) return;
					credsInAnyUse.add(cred.id);
					if (workflow.active) credsInActiveUse.add(cred.id);
				});
			});
		});
		return {
			credsInAnyUse,
			credsInActiveUse,
		};
	}
	async getAllExistingCreds() {
		const credentials = await this.credentialsRepository.find({ select: ['id', 'name'] });
		return credentials.map(({ id, name }) => ({ kind: 'credential', id, name }));
	}
	async getExecutedWorkflowsInPastDays(days) {
		const date = new Date();
		date.setDate(date.getDate() - days);
		const executionIds = await this.executionRepository.getIdsSince(date);
		return await this.executionDataRepository.findByExecutionIds(executionIds);
	}
	async getCredsInRecentlyExecutedWorkflows(days) {
		const executedWorkflows = await this.getExecutedWorkflowsInPastDays(days);
		return executedWorkflows.reduce((acc, { nodes }) => {
			nodes.forEach((node) => {
				if (node.credentials) {
					Object.values(node.credentials).forEach((c) => {
						if (c.id) acc.add(c.id);
					});
				}
			});
			return acc;
		}, new Set());
	}
};
exports.CredentialsRiskReporter = CredentialsRiskReporter;
exports.CredentialsRiskReporter = CredentialsRiskReporter = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.CredentialsRepository,
			db_1.ExecutionRepository,
			db_1.ExecutionDataRepository,
			config_1.SecurityConfig,
		]),
	],
	CredentialsRiskReporter,
);
//# sourceMappingURL=credentials-risk-reporter.js.map
