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
exports.MOCK_PACKAGE = exports.MOCK_01110_N8N_VERSION = exports.MOCK_09990_N8N_VERSION = void 0;
exports.getRiskSection = getRiskSection;
exports.saveManualTriggerWorkflow = saveManualTriggerWorkflow;
exports.simulateOutdatedInstanceOnce = simulateOutdatedInstanceOnce;
exports.simulateUpToDateInstance = simulateUpToDateInstance;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const nock_1 = __importDefault(require('nock'));
const uuid_1 = require('uuid');
const constants = __importStar(require('@/constants'));
const utils_1 = require('@/security-audit/utils');
function getRiskSection(testAudit, riskCategory, sectionTitle) {
	if (Array.isArray(testAudit)) {
		throw new Error('Expected test audit not to be an array');
	}
	const report = testAudit[(0, utils_1.toReportTitle)(riskCategory)];
	if (!report) throw new Error(`Expected risk "${riskCategory}"`);
	for (const section of report.sections) {
		if (section.title === sectionTitle) {
			return section;
		}
	}
	throw new Error(`Expected section "${sectionTitle}" for risk "${riskCategory}"`);
}
async function saveManualTriggerWorkflow() {
	const details = {
		id: '1',
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: (0, uuid_1.v4)(),
				name: 'My Node',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
			},
		],
	};
	return await di_1.Container.get(db_1.WorkflowRepository).save(details);
}
exports.MOCK_09990_N8N_VERSION = {
	name: '0.999.0',
	nodes: [
		{
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			icon: 'file:testNode.svg',
			defaults: {
				name: 'Test Node',
			},
		},
	],
	createdAt: '2022-11-11T11:11:11.111Z',
	description:
		'Includes <strong>new nodes</strong>, <strong>node enhancements</strong>, <strong>core functionality</strong> and <strong>bug fixes</strong>',
	documentationUrl: 'https://docs.n8n.io/reference/release-notes/#n8n09990',
	hasBreakingChange: false,
	hasSecurityFix: false,
	hasSecurityIssue: false,
	securityIssueFixVersion: null,
};
exports.MOCK_01110_N8N_VERSION = {
	name: '0.111.0',
	nodes: [],
	createdAt: '2022-01-01T00:00:00.000Z',
	description:
		'Includes <strong>new nodes</strong>, <strong>node enhancements</strong>, <strong>core functionality</strong> and <strong>bug fixes</strong>',
	documentationUrl: 'https://docs.n8n.io/reference/release-notes/#n8n01110',
	hasBreakingChange: false,
	hasSecurityFix: false,
	hasSecurityIssue: false,
	securityIssueFixVersion: null,
};
exports.MOCK_PACKAGE = [
	{
		createdAt: new Date(),
		updatedAt: new Date(),
		packageName: 'n8n-nodes-test',
		installedVersion: '1.1.2',
		authorName: 'test',
		authorEmail: 'test@test.com',
		setUpdateDate: () => {},
		installedNodes: [
			{
				name: 'My Test Node',
				type: 'myTestNode',
				latestVersion: 1,
			},
		],
	},
];
function simulateOutdatedInstanceOnce(versionName = exports.MOCK_01110_N8N_VERSION.name) {
	const baseUrl = di_1.Container.get(config_1.GlobalConfig).versionNotifications.endpoint + '/';
	constants.N8N_VERSION = versionName;
	(0, nock_1.default)(baseUrl)
		.get(versionName)
		.reply(200, [exports.MOCK_01110_N8N_VERSION, exports.MOCK_09990_N8N_VERSION]);
}
function simulateUpToDateInstance(versionName = exports.MOCK_09990_N8N_VERSION.name) {
	const baseUrl = di_1.Container.get(config_1.GlobalConfig).versionNotifications.endpoint + '/';
	constants.N8N_VERSION = versionName;
	(0, nock_1.default)(baseUrl)
		.persist()
		.get(versionName)
		.reply(200, [exports.MOCK_09990_N8N_VERSION]);
}
//# sourceMappingURL=utils.js.map
