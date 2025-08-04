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
exports.AccessService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const workflow_finder_service_1 = require('@/workflows/workflow-finder.service');
let AccessService = class AccessService {
	constructor(userRepository, workflowFinderService) {
		this.userRepository = userRepository;
		this.workflowFinderService = workflowFinderService;
	}
	async hasReadAccess(userId, workflowId) {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) return false;
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		return workflow !== null;
	}
};
exports.AccessService = AccessService;
exports.AccessService = AccessService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.UserRepository,
			workflow_finder_service_1.WorkflowFinderService,
		]),
	],
	AccessService,
);
//# sourceMappingURL=access.service.js.map
