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
exports.CollaborationState = void 0;
const constants_1 = require('@n8n/constants');
const di_1 = require('@n8n/di');
const cache_service_1 = require('@/services/cache/cache.service');
let CollaborationState = class CollaborationState {
	constructor(cache) {
		this.cache = cache;
		this.inactivityCleanUpTime = 15 * constants_1.Time.minutes.toMilliseconds;
	}
	async addCollaborator(workflowId, userId) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		const cacheEntry = {
			[userId]: new Date().toISOString(),
		};
		await this.cache.setHash(cacheKey, cacheEntry);
	}
	async removeCollaborator(workflowId, userId) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		await this.cache.deleteFromHash(cacheKey, userId);
	}
	async getCollaborators(workflowId) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		const cacheValue = await this.cache.getHash(cacheKey);
		if (!cacheValue) {
			return [];
		}
		const activeCollaborators = this.cacheHashToCollaborators(cacheValue);
		const [expired, stillActive] = this.splitToExpiredAndStillActive(activeCollaborators);
		if (expired.length > 0) {
			void this.removeExpiredCollaborators(workflowId, expired);
		}
		return stillActive;
	}
	formWorkflowCacheKey(workflowId) {
		return `collaboration:${workflowId}`;
	}
	splitToExpiredAndStillActive(collaborators) {
		const expired = [];
		const stillActive = [];
		for (const collaborator of collaborators) {
			if (this.hasSessionExpired(collaborator.lastSeen)) {
				expired.push(collaborator);
			} else {
				stillActive.push(collaborator);
			}
		}
		return [expired, stillActive];
	}
	async removeExpiredCollaborators(workflowId, expiredUsers) {
		const cacheKey = this.formWorkflowCacheKey(workflowId);
		await Promise.all(
			expiredUsers.map(async (user) => await this.cache.deleteFromHash(cacheKey, user.userId)),
		);
	}
	cacheHashToCollaborators(workflowCacheEntry) {
		return Object.entries(workflowCacheEntry).map(([userId, lastSeen]) => ({
			userId,
			lastSeen,
		}));
	}
	hasSessionExpired(lastSeenString) {
		const expiryTime = new Date(lastSeenString).getTime() + this.inactivityCleanUpTime;
		return Date.now() > expiryTime;
	}
};
exports.CollaborationState = CollaborationState;
exports.CollaborationState = CollaborationState = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [cache_service_1.CacheService])],
	CollaborationState,
);
//# sourceMappingURL=collaboration.state.js.map
