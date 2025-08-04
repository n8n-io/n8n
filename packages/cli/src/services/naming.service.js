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
exports.NamingService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
let NamingService = class NamingService {
	constructor(workflowRepository, credentialsRepository) {
		this.workflowRepository = workflowRepository;
		this.credentialsRepository = credentialsRepository;
	}
	async getUniqueWorkflowName(requestedName) {
		return await this.getUniqueName(requestedName, 'workflow');
	}
	async getUniqueCredentialName(requestedName) {
		return await this.getUniqueName(requestedName, 'credential');
	}
	async getUniqueName(requestedName, entity) {
		const repository = entity === 'workflow' ? this.workflowRepository : this.credentialsRepository;
		const found = await repository.findStartingWith(requestedName);
		if (found.length === 0) return requestedName;
		if (found.length === 1) return [requestedName, 2].join(' ');
		const maxSuffix = found.reduce((max, { name }) => {
			const [_, strSuffix] = name.split(`${requestedName} `);
			const numSuffix = parseInt(strSuffix);
			if (isNaN(numSuffix)) return max;
			if (numSuffix > max) max = numSuffix;
			return max;
		}, 2);
		return [requestedName, maxSuffix + 1].join(' ');
	}
};
exports.NamingService = NamingService;
exports.NamingService = NamingService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [db_1.WorkflowRepository, db_1.CredentialsRepository]),
	],
	NamingService,
);
//# sourceMappingURL=naming.service.js.map
