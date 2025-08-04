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
var __exportStar =
	(this && this.__exportStar) ||
	function (m, exports) {
		for (var p in m)
			if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
				__createBinding(exports, m, p);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.MOCK_PINDATA = exports.setInstanceOwnerSetUp = exports.setupTestServer = void 0;
exports.initActiveWorkflowManager = initActiveWorkflowManager;
exports.initCredentialsTypes = initCredentialsTypes;
exports.initNodeTypes = initNodeTypes;
exports.initBinaryDataService = initBinaryDataService;
exports.getAuthToken = getAuthToken;
exports.isInstanceOwnerSetUp = isInstanceOwnerSetUp;
exports.makeWorkflow = makeWorkflow;
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const Ftp_credentials_1 = require('n8n-nodes-base/credentials/Ftp.credentials');
const GithubApi_credentials_1 = require('n8n-nodes-base/credentials/GithubApi.credentials');
const Cron_node_1 = require('n8n-nodes-base/nodes/Cron/Cron.node');
const FormTrigger_node_1 = require('n8n-nodes-base/nodes/Form/FormTrigger.node');
const ScheduleTrigger_node_1 = require('n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node');
const Set_node_1 = require('n8n-nodes-base/nodes/Set/Set.node');
const Start_node_1 = require('n8n-nodes-base/nodes/Start/Start.node');
const uuid_1 = require('uuid');
const config_1 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const execution_service_1 = require('@/executions/execution.service');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const push_1 = require('@/push');
var test_server_1 = require('./test-server');
Object.defineProperty(exports, 'setupTestServer', {
	enumerable: true,
	get: function () {
		return test_server_1.setupTestServer;
	},
});
async function initActiveWorkflowManager() {
	(0, backend_test_utils_1.mockInstance)(n8n_core_1.BinaryDataConfig);
	(0, backend_test_utils_1.mockInstance)(n8n_core_1.InstanceSettings, {
		isMultiMain: false,
	});
	(0, backend_test_utils_1.mockInstance)(push_1.Push);
	(0, backend_test_utils_1.mockInstance)(execution_service_1.ExecutionService);
	const { ActiveWorkflowManager } = await Promise.resolve().then(() =>
		__importStar(require('@/active-workflow-manager')),
	);
	const activeWorkflowManager = di_1.Container.get(ActiveWorkflowManager);
	await activeWorkflowManager.init();
	return activeWorkflowManager;
}
async function initCredentialsTypes() {
	di_1.Container.get(load_nodes_and_credentials_1.LoadNodesAndCredentials).loaded.credentials = {
		githubApi: {
			type: new GithubApi_credentials_1.GithubApi(),
			sourcePath: '',
		},
		ftp: {
			type: new Ftp_credentials_1.Ftp(),
			sourcePath: '',
		},
	};
}
async function initNodeTypes(customNodes) {
	const defaultNodes = {
		'n8n-nodes-base.start': {
			type: new Start_node_1.Start(),
			sourcePath: '',
		},
		'n8n-nodes-base.cron': {
			type: new Cron_node_1.Cron(),
			sourcePath: '',
		},
		'n8n-nodes-base.set': {
			type: new Set_node_1.Set(),
			sourcePath: '',
		},
		'n8n-nodes-base.scheduleTrigger': {
			type: new ScheduleTrigger_node_1.ScheduleTrigger(),
			sourcePath: '',
		},
		'n8n-nodes-base.formTrigger': {
			type: new FormTrigger_node_1.FormTrigger(),
			sourcePath: '',
		},
	};
	ScheduleTrigger_node_1.ScheduleTrigger.prototype.trigger = async () => ({});
	const nodes = customNodes ?? defaultNodes;
	const loader = (0, jest_mock_extended_1.mock)();
	loader.getNode.mockImplementation((nodeType) => {
		const node = nodes[`n8n-nodes-base.${nodeType}`];
		if (!node) throw new n8n_core_1.UnrecognizedNodeTypeError('n8n-nodes-base', nodeType);
		return node;
	});
	const loadNodesAndCredentials = di_1.Container.get(
		load_nodes_and_credentials_1.LoadNodesAndCredentials,
	);
	loadNodesAndCredentials.loaders = { 'n8n-nodes-base': loader };
	loadNodesAndCredentials.loaded.nodes = nodes;
}
async function initBinaryDataService(mode = 'default') {
	const config = (0, jest_mock_extended_1.mock)({
		mode,
		availableModes: [mode],
		localStoragePath: '',
	});
	const binaryDataService = new n8n_core_1.BinaryDataService(config);
	await binaryDataService.init();
	di_1.Container.set(n8n_core_1.BinaryDataService, binaryDataService);
}
function getAuthToken(response, authCookieName = constants_1.AUTH_COOKIE_NAME) {
	const cookiesHeader = response.headers['set-cookie'];
	if (!cookiesHeader) return undefined;
	const cookies = Array.isArray(cookiesHeader) ? cookiesHeader : [cookiesHeader];
	const authCookie = cookies.find((c) => c.startsWith(`${authCookieName}=`));
	if (!authCookie) return undefined;
	const match = authCookie.match(new RegExp(`(^| )${authCookieName}=(?<token>[^;]+)`));
	if (!match?.groups) return undefined;
	return match.groups.token;
}
async function isInstanceOwnerSetUp() {
	const { value } = await di_1.Container.get(db_1.SettingsRepository).findOneByOrFail({
		key: 'userManagement.isInstanceOwnerSetUp',
	});
	return Boolean(value);
}
const setInstanceOwnerSetUp = async (value) => {
	config_1.default.set('userManagement.isInstanceOwnerSetUp', value);
	await di_1.Container.get(db_1.SettingsRepository).update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: JSON.stringify(value) },
	);
};
exports.setInstanceOwnerSetUp = setInstanceOwnerSetUp;
__exportStar(require('./community-nodes'), exports);
function makeWorkflow(options) {
	const workflow = new db_1.WorkflowEntity();
	const node = {
		id: (0, uuid_1.v4)(),
		name: 'Cron',
		type: 'n8n-nodes-base.cron',
		parameters: {},
		typeVersion: 1,
		position: [740, 240],
	};
	if (options?.withCredential) {
		node.credentials = {
			spotifyApi: options.withCredential,
		};
	}
	workflow.name = 'My Workflow';
	workflow.active = false;
	workflow.connections = {};
	workflow.nodes = [node];
	if (options?.withPinData) {
		workflow.pinData = exports.MOCK_PINDATA;
	}
	return workflow;
}
exports.MOCK_PINDATA = { Spotify: [{ json: { myKey: 'myValue' } }] };
//# sourceMappingURL=index.js.map
