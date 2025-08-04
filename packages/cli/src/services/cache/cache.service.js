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
exports.CacheService = void 0;
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const di_1 = require('@n8n/di');
const cache_manager_1 = require('cache-manager');
const n8n_workflow_1 = require('n8n-workflow');
const config_2 = __importDefault(require('@/config'));
const malformed_refresh_value_error_1 = require('@/errors/cache-errors/malformed-refresh-value.error');
const uncacheable_value_error_1 = require('@/errors/cache-errors/uncacheable-value.error');
const typed_emitter_1 = require('@/typed-emitter');
let CacheService = class CacheService extends typed_emitter_1.TypedEmitter {
	constructor(globalConfig) {
		super();
		this.globalConfig = globalConfig;
	}
	async init() {
		const { backend } = this.globalConfig.cache;
		const mode = config_2.default.getEnv('executions.mode');
		const useRedis = backend === 'redis' || (backend === 'auto' && mode === 'queue');
		if (useRedis) {
			const { RedisClientService } = await Promise.resolve().then(() =>
				__importStar(require('../redis-client.service')),
			);
			const redisClientService = di_1.Container.get(RedisClientService);
			const prefixBase = this.globalConfig.redis.prefix;
			const prefix = redisClientService.toValidPrefix(
				`${prefixBase}:${this.globalConfig.cache.redis.prefix}:`,
			);
			const redisClient = redisClientService.createClient({
				type: 'cache(n8n)',
				extraOptions: { keyPrefix: prefix },
			});
			const { redisStoreUsingClient } = await Promise.resolve().then(() =>
				__importStar(require('@/services/cache/redis.cache-manager')),
			);
			const redisStore = redisStoreUsingClient(redisClient, {
				ttl: this.globalConfig.cache.redis.ttl,
			});
			const redisCache = await (0, cache_manager_1.caching)(redisStore);
			this.cache = { ...redisCache, kind: 'redis' };
			return;
		}
		const { maxSize, ttl } = this.globalConfig.cache.memory;
		const sizeCalculation = (item) => {
			const str = (0, n8n_workflow_1.jsonStringify)(item, { replaceCircularRefs: true });
			return new TextEncoder().encode(str).length;
		};
		const memoryCache = await (0, cache_manager_1.caching)('memory', {
			ttl,
			maxSize,
			sizeCalculation,
		});
		this.cache = { ...memoryCache, kind: 'memory' };
	}
	async reset() {
		await this.cache.store.reset();
	}
	isRedis() {
		return this.cache.kind === 'redis';
	}
	isMemory() {
		return this.cache.kind === 'memory';
	}
	async set(key, value, ttl) {
		if (!this.cache) await this.init();
		if (!key || !value) return;
		if (this.cache.kind === 'redis' && !this.cache.store.isCacheable(value)) {
			throw new uncacheable_value_error_1.UncacheableValueError(key);
		}
		await this.cache.store.set(key, value, ttl);
	}
	async setMany(keysValues, ttl) {
		if (!this.cache) await this.init();
		if (keysValues.length === 0) return;
		const truthyKeysValues = keysValues.filter(
			([key, value]) => key?.length > 0 && value !== undefined && value !== null,
		);
		if (this.cache.kind === 'redis') {
			for (const [key, value] of truthyKeysValues) {
				if (!this.cache.store.isCacheable(value)) {
					throw new uncacheable_value_error_1.UncacheableValueError(key);
				}
			}
		}
		await this.cache.store.mset(truthyKeysValues, ttl);
	}
	async setHash(key, hash) {
		if (!this.cache) await this.init();
		if (!key?.length) return;
		for (const hashKey in hash) {
			if (hash[hashKey] === undefined || hash[hashKey] === null) return;
		}
		if (this.cache.kind === 'redis') {
			await this.cache.store.hset(key, hash);
			return;
		}
		const hashObject = (await this.get(key)) ?? {};
		Object.assign(hashObject, hash);
		await this.set(key, hashObject);
	}
	async expire(key, ttlMs) {
		if (!this.cache) await this.init();
		if (!key?.length) return;
		if (this.cache.kind === 'memory') {
			throw new n8n_workflow_1.UserError('Method `expire` not yet implemented for in-memory cache');
		}
		await this.cache.store.expire(key, ttlMs * constants_1.Time.milliseconds.toSeconds);
	}
	async get(key, { fallbackValue, refreshFn } = {}) {
		if (!this.cache) await this.init();
		if (key?.length === 0) return;
		const value = await this.cache.store.get(key);
		if (value !== undefined) {
			this.emit('metrics.cache.hit');
			return value;
		}
		this.emit('metrics.cache.miss');
		if (refreshFn) {
			this.emit('metrics.cache.update');
			const refreshValue = await refreshFn(key);
			await this.set(key, refreshValue);
			return refreshValue;
		}
		return fallbackValue;
	}
	async getMany(keys, { fallbackValue, refreshFn } = {}) {
		if (!this.cache) await this.init();
		if (keys.length === 0) return [];
		const values = await this.cache.store.mget(...keys);
		if (values !== undefined) {
			this.emit('metrics.cache.hit');
			return values;
		}
		this.emit('metrics.cache.miss');
		if (refreshFn) {
			this.emit('metrics.cache.update');
			const refreshValue = await refreshFn(keys);
			if (keys.length !== refreshValue.length) {
				throw new malformed_refresh_value_error_1.MalformedRefreshValueError();
			}
			const newValue = keys.map((key, i) => [key, refreshValue[i]]);
			await this.setMany(newValue);
			return refreshValue;
		}
		return fallbackValue;
	}
	async getHash(key, { fallbackValue, refreshFn } = {}) {
		if (!this.cache) await this.init();
		const hash =
			this.cache.kind === 'redis' ? await this.cache.store.hgetall(key) : await this.get(key);
		if (hash !== undefined) {
			this.emit('metrics.cache.hit');
			return hash;
		}
		this.emit('metrics.cache.miss');
		if (refreshFn) {
			this.emit('metrics.cache.update');
			const refreshValue = await refreshFn(key);
			await this.set(key, refreshValue);
			return refreshValue;
		}
		return fallbackValue;
	}
	async getHashValue(cacheKey, hashKey, { fallbackValue, refreshFn } = {}) {
		if (!this.cache) await this.init();
		let hashValue;
		if (this.cache.kind === 'redis') {
			hashValue = await this.cache.store.hget(cacheKey, hashKey);
		} else {
			const hashObject = await this.cache.store.get(cacheKey);
			hashValue = hashObject?.[hashKey];
		}
		if (hashValue !== undefined) {
			this.emit('metrics.cache.hit');
			return hashValue;
		}
		this.emit('metrics.cache.miss');
		if (refreshFn) {
			this.emit('metrics.cache.update');
			const refreshValue = await refreshFn(cacheKey);
			await this.set(cacheKey, refreshValue);
			return refreshValue;
		}
		return fallbackValue;
	}
	async delete(key) {
		if (!this.cache) await this.init();
		if (!key?.length) return;
		await this.cache.store.del(key);
	}
	async deleteMany(keys) {
		if (!this.cache) await this.init();
		if (keys.length === 0) return;
		return await this.cache.store.mdel(...keys);
	}
	async deleteFromHash(cacheKey, hashKey) {
		if (!this.cache) await this.init();
		if (!cacheKey || !hashKey) return;
		if (this.cache.kind === 'redis') {
			await this.cache.store.hdel(cacheKey, hashKey);
			return;
		}
		const hashObject = await this.get(cacheKey);
		if (!hashObject) return;
		delete hashObject[hashKey];
		await this.cache.store.set(cacheKey, hashObject);
	}
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [config_1.GlobalConfig])],
	CacheService,
);
//# sourceMappingURL=cache.service.js.map
