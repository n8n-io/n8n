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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.HooksService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const rudder_sdk_node_1 = __importDefault(require('@rudderstack/rudder-sdk-node'));
const auth_service_1 = require('@/auth/auth.service');
const user_service_1 = require('@/services/user.service');
let HooksService = class HooksService {
	constructor(
		userService,
		authService,
		userRepository,
		settingsRepository,
		workflowRepository,
		credentialsRepository,
	) {
		this.userService = userService;
		this.authService = authService;
		this.userRepository = userRepository;
		this.settingsRepository = settingsRepository;
		this.workflowRepository = workflowRepository;
		this.credentialsRepository = credentialsRepository;
		this.innerAuthMiddleware = authService.createAuthMiddleware(false);
	}
	async inviteUsers(owner, attributes) {
		return await this.userService.inviteUsers(owner, attributes);
	}
	issueCookie(res, user) {
		return this.authService.issueCookie(res, user, user.mfaEnabled);
	}
	async findOneUser(filter) {
		return await this.userRepository.findOne(filter);
	}
	async saveUser(user) {
		return await this.userRepository.save(user);
	}
	async updateSettings(filter, set) {
		return await this.settingsRepository.update(filter, set);
	}
	async workflowsCount(filter) {
		return await this.workflowRepository.count(filter);
	}
	async credentialsCount(filter) {
		return await this.credentialsRepository.count(filter);
	}
	async settingsCount(filter) {
		return await this.settingsRepository.count(filter);
	}
	async authMiddleware(req, res, next) {
		return await this.innerAuthMiddleware(req, res, next);
	}
	getRudderStackClient(key, options) {
		return new rudder_sdk_node_1.default(key, options);
	}
	dbCollections() {
		return {
			User: this.userRepository,
			Settings: this.settingsRepository,
			Credentials: this.credentialsRepository,
			Workflow: this.workflowRepository,
		};
	}
};
exports.HooksService = HooksService;
exports.HooksService = HooksService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			user_service_1.UserService,
			auth_service_1.AuthService,
			db_1.UserRepository,
			db_1.SettingsRepository,
			db_1.WorkflowRepository,
			db_1.CredentialsRepository,
		]),
	],
	HooksService,
);
//# sourceMappingURL=hooks.service.js.map
