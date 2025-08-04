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
exports.LastActiveAtService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const luxon_1 = require('luxon');
let LastActiveAtService = class LastActiveAtService {
	constructor(userRepository, logger) {
		this.userRepository = userRepository;
		this.logger = logger;
		this.lastActiveCache = new Map();
	}
	async middleware(req, res, next) {
		if (req.user) {
			this.updateLastActiveIfStale(req.user.id).catch((error) => {
				this.logger.error('Failed to update last active timestamp', { error });
			});
			next();
		} else {
			res.status(401).json({ status: 'error', message: 'Unauthorized' });
		}
	}
	async updateLastActiveIfStale(userId) {
		const now = luxon_1.DateTime.now().startOf('day');
		const dateNow = now.toISODate();
		const last = this.lastActiveCache.get(userId);
		if (!last || last !== dateNow) {
			await this.userRepository
				.createQueryBuilder()
				.update()
				.set({ lastActiveAt: now.toJSDate() })
				.where('id = :id', { id: userId })
				.execute();
			this.lastActiveCache.set(userId, dateNow);
		}
	}
};
exports.LastActiveAtService = LastActiveAtService;
exports.LastActiveAtService = LastActiveAtService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [db_1.UserRepository, backend_common_1.Logger]),
	],
	LastActiveAtService,
);
//# sourceMappingURL=last-active-at.service.js.map
