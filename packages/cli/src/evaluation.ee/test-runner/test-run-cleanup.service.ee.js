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
exports.TestRunCleanupService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
let TestRunCleanupService = class TestRunCleanupService {
	constructor(logger, testRunRepository) {
		this.logger = logger;
		this.testRunRepository = testRunRepository;
	}
	async cleanupIncompleteRuns() {
		const result = await this.testRunRepository.markAllIncompleteAsFailed();
		if (result.affected && result.affected > 0) {
			this.logger.debug(`Marked ${result.affected} incomplete test runs as failed`);
		}
	}
};
exports.TestRunCleanupService = TestRunCleanupService;
exports.TestRunCleanupService = TestRunCleanupService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [backend_common_1.Logger, db_1.TestRunRepository]),
	],
	TestRunCleanupService,
);
//# sourceMappingURL=test-run-cleanup.service.ee.js.map
