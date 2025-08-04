'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TestFailProvider =
	exports.FailedProvider =
	exports.ErrorProvider =
	exports.AnotherDummyProvider =
	exports.DummyProvider =
	exports.MockProviders =
		void 0;
const types_1 = require('@/modules/external-secrets.ee/types');
class MockProviders {
	constructor() {
		this.providers = {
			dummy: DummyProvider,
		};
	}
	setProviders(providers) {
		this.providers = providers;
	}
	getProvider(name) {
		return this.providers[name];
	}
	hasProvider(name) {
		return name in this.providers;
	}
	getAllProviders() {
		return this.providers;
	}
}
exports.MockProviders = MockProviders;
class DummyProvider extends types_1.SecretsProvider {
	constructor() {
		super(...arguments);
		this.properties = [
			{
				name: 'username',
				displayName: 'Username',
				type: 'string',
				default: '',
				required: true,
			},
			{
				name: 'other',
				displayName: 'Other',
				type: 'string',
				default: '',
			},
			{
				name: 'password',
				displayName: 'Password',
				type: 'string',
				default: '',
				typeOptions: {
					password: true,
				},
			},
		];
		this.secrets = {};
		this.displayName = 'Dummy Provider';
		this.name = 'dummy';
		this.state = 'initializing';
		this._updateSecrets = {
			test1: 'value1',
			test2: 'value2',
		};
	}
	async init(_settings) {}
	async connect() {
		this.state = 'connected';
	}
	async disconnect() {}
	async update() {
		this.secrets = this._updateSecrets;
	}
	async test() {
		return [true];
	}
	getSecret(name) {
		return this.secrets[name];
	}
	hasSecret(name) {
		return name in this.secrets;
	}
	getSecretNames() {
		return Object.keys(this.secrets);
	}
}
exports.DummyProvider = DummyProvider;
class AnotherDummyProvider extends DummyProvider {
	constructor() {
		super(...arguments);
		this.name = 'another_dummy';
	}
}
exports.AnotherDummyProvider = AnotherDummyProvider;
class ErrorProvider extends types_1.SecretsProvider {
	constructor() {
		super(...arguments);
		this.secrets = {};
		this.displayName = 'Error Provider';
		this.name = 'dummy';
		this.state = 'initializing';
	}
	async init(_settings) {
		throw new Error();
	}
	async connect() {
		this.state = 'error';
		throw new Error();
	}
	async disconnect() {}
	async update() {
		throw new Error();
	}
	async test() {
		throw new Error();
	}
	getSecret(_name) {
		throw new Error();
	}
	hasSecret(_name) {
		throw new Error();
	}
	getSecretNames() {
		throw new Error();
	}
}
exports.ErrorProvider = ErrorProvider;
class FailedProvider extends types_1.SecretsProvider {
	constructor() {
		super(...arguments);
		this.secrets = {};
		this.displayName = 'Failed Provider';
		this.name = 'dummy';
		this.state = 'initializing';
	}
	async init(_settings) {}
	async connect() {
		this.state = 'error';
	}
	async disconnect() {}
	async update() {}
	async test() {
		return [true];
	}
	getSecret(name) {
		return this.secrets[name];
	}
	hasSecret(name) {
		return name in this.secrets;
	}
	getSecretNames() {
		return Object.keys(this.secrets);
	}
}
exports.FailedProvider = FailedProvider;
class TestFailProvider extends types_1.SecretsProvider {
	constructor() {
		super(...arguments);
		this.secrets = {};
		this.displayName = 'Test Failed Provider';
		this.name = 'dummy';
		this.state = 'initializing';
		this._updateSecrets = {
			test1: 'value1',
			test2: 'value2',
		};
	}
	async init(_settings) {}
	async connect() {
		this.state = 'connected';
	}
	async disconnect() {}
	async update() {
		this.secrets = this._updateSecrets;
	}
	async test() {
		return [false];
	}
	getSecret(name) {
		return this.secrets[name];
	}
	hasSecret(name) {
		return name in this.secrets;
	}
	getSecretNames() {
		return Object.keys(this.secrets);
	}
}
exports.TestFailProvider = TestFailProvider;
//# sourceMappingURL=utils.js.map
