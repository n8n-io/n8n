'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.InfisicalProvider = void 0;
const infisical_node_1 = __importDefault(require('infisical-node'));
const serviceTokenData_1 = require('infisical-node/lib/api/serviceTokenData');
const key_1 = require('infisical-node/lib/helpers/key');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('../constants');
class InfisicalProvider {
	constructor() {
		this.properties = [
			{
				displayName:
					'<h2>Important information about our infisical integration</h2><br>From the <b>30th July, 2024</b>, we will no longer be supporting new connections to inifiscal secrets vault using service tokens. Existing service tokens will remain usable until <b>July, 2025</b>. After that period, we will be removing support for Infisical from our external secrets integrations. You can find out more information about this change on <a href="https://docs.n8n.io/external-secrets/#connect-n8n-to-your-secrets-store" target="_blank">our docs</a>',
				name: 'notice',
				type: 'notice',
				default: '',
				noDataExpression: true,
			},
			{
				displayName: 'Service Token',
				name: 'token',
				type: 'string',
				hint: 'The Infisical Service Token with read access',
				default: '',
				required: true,
				placeholder: 'e.g. st.64ae963e1874ea.374226a166439dce.39557e4a1b7bdd82',
				noDataExpression: true,
				typeOptions: { password: true },
			},
			{
				displayName: 'Site URL',
				name: 'siteURL',
				type: 'string',
				hint: "The absolute URL of the Infisical instance. Change it only if you're self-hosting Infisical.",
				required: true,
				noDataExpression: true,
				placeholder: 'https://app.infisical.com',
				default: 'https://app.infisical.com',
			},
		];
		this.displayName = 'Infisical';
		this.name = 'infisical';
		this.state = 'initializing';
		this.cachedSecrets = {};
	}
	async init(settings) {
		this.settings = settings.settings;
	}
	async update() {
		if (!this.client) {
			throw new n8n_workflow_1.UnexpectedError(
				'Updated attempted on Infisical when initialization failed',
			);
		}
		if (!(await this.test())[0]) {
			throw new n8n_workflow_1.UnexpectedError('Infisical provider test failed during update');
		}
		const secrets = await this.client.getAllSecrets({
			environment: this.environment,
			path: '/',
			attachToProcessEnv: false,
			includeImports: true,
		});
		const newCache = Object.fromEntries(secrets.map((s) => [s.secretName, s.secretValue]));
		if (Object.keys(newCache).length === 1 && '' in newCache) {
			this.cachedSecrets = {};
		} else {
			this.cachedSecrets = newCache;
		}
	}
	async connect() {
		this.client = new infisical_node_1.default(this.settings);
		if ((await this.test())[0]) {
			try {
				this.environment = await this.getEnvironment();
				this.state = 'connected';
			} catch {
				this.state = 'error';
			}
		} else {
			this.state = 'error';
		}
	}
	async getEnvironment() {
		const serviceTokenData = await (0, serviceTokenData_1.getServiceTokenData)(
			this.client.clientConfig,
		);
		if (serviceTokenData.environment) {
			return serviceTokenData.environment;
		}
		if (serviceTokenData.scopes) {
			return serviceTokenData.scopes[0].environment;
		}
		throw new n8n_workflow_1.UnexpectedError("Couldn't find environment for Infisical");
	}
	async test() {
		if (!this.client) {
			return [false, 'Client not initialized'];
		}
		try {
			await (0, key_1.populateClientWorkspaceConfigsHelper)(this.client.clientConfig);
			return [true];
		} catch (e) {
			return [false];
		}
	}
	async disconnect() {}
	getSecret(name) {
		return this.cachedSecrets[name];
	}
	getSecretNames() {
		return Object.keys(this.cachedSecrets).filter((k) =>
			constants_1.EXTERNAL_SECRETS_NAME_REGEX.test(k),
		);
	}
	hasSecret(name) {
		return name in this.cachedSecrets;
	}
}
exports.InfisicalProvider = InfisicalProvider;
//# sourceMappingURL=infisical.js.map
