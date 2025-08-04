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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SecurityAudit = void 0;
const config_1 = require('@n8n/config');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const zod_1 = __importDefault(require('zod'));
const constants_1 = require('@/security-audit/constants');
const base_command_1 = require('./base-command');
const flagsSchema = zod_1.default.object({
	categories: zod_1.default
		.string()
		.default(constants_1.RISK_CATEGORIES.join(','))
		.describe('Comma-separated list of categories to include in the audit'),
	'days-abandoned-workflow': zod_1.default
		.number()
		.int()
		.default(di_1.Container.get(config_1.SecurityConfig).daysAbandonedWorkflow)
		.describe('Days for a workflow to be considered abandoned if not executed'),
});
let SecurityAudit = class SecurityAudit extends base_command_1.BaseCommand {
	async run() {
		const { flags: auditFlags } = this;
		const categories =
			auditFlags.categories?.split(',').filter((c) => c !== '') ?? constants_1.RISK_CATEGORIES;
		const invalidCategories = categories.filter((c) => !constants_1.RISK_CATEGORIES.includes(c));
		if (invalidCategories.length > 0) {
			const message =
				invalidCategories.length > 1
					? `Invalid categories received: ${invalidCategories.join(', ')}`
					: `Invalid category received: ${invalidCategories[0]}`;
			const hint = `Valid categories are: ${constants_1.RISK_CATEGORIES.join(', ')}`;
			throw new n8n_workflow_1.UserError([message, hint].join('. '));
		}
		const { SecurityAuditService } = await Promise.resolve().then(() =>
			__importStar(require('@/security-audit/security-audit.service')),
		);
		const result = await di_1.Container.get(SecurityAuditService).run(
			categories,
			auditFlags['days-abandoned-workflow'],
		);
		if (Array.isArray(result) && result.length === 0) {
			this.logger.info('No security issues found');
		} else {
			process.stdout.write(JSON.stringify(result, null, 2));
		}
	}
	async catch(error) {
		this.logger.error('Failed to generate security audit');
		this.logger.error(error.message);
	}
};
exports.SecurityAudit = SecurityAudit;
exports.SecurityAudit = SecurityAudit = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'audit',
			description: 'Generate a security audit report for this n8n instance',
			examples: ['', '--categories=database,credentials', '--days-abandoned-workflow=10'],
			flagsSchema,
		}),
	],
	SecurityAudit,
);
//# sourceMappingURL=audit.js.map
