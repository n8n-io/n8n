'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.avoidNoCacheable = exports.NoCacheableError = void 0;
exports.redisStoreUsingClient = redisStoreUsingClient;
exports.redisStore = redisStore;
const ioredis_1 = __importDefault(require('ioredis'));
const n8n_workflow_1 = require('n8n-workflow');
class NoCacheableError {
	constructor(message) {
		this.message = message;
		this.name = 'NoCacheableError';
	}
}
exports.NoCacheableError = NoCacheableError;
const avoidNoCacheable = async (p) => {
	try {
		return await p;
	} catch (e) {
		if (!(e instanceof NoCacheableError)) throw e;
		return undefined;
	}
};
exports.avoidNoCacheable = avoidNoCacheable;
function builder(redisCache, reset, keys, options) {
	const isCacheable = options?.isCacheable ?? ((value) => value !== undefined && value !== null);
	const getVal = (value) => JSON.stringify(value) || '"undefined"';
	return {
		async get(key) {
			const val = await redisCache.get(key);
			if (val === undefined || val === null) return undefined;
			else return (0, n8n_workflow_1.jsonParse)(val);
		},
		async expire(key, ttlSeconds) {
			await redisCache.expire(key, ttlSeconds);
		},
		async set(key, value, ttl) {
			if (!isCacheable(value)) throw new NoCacheableError(`"${value}" is not a cacheable value`);
			const t = ttl ?? options?.ttl;
			if (t !== undefined && t !== 0) await redisCache.set(key, getVal(value), 'PX', t);
			else await redisCache.set(key, getVal(value));
		},
		async mset(args, ttl) {
			const t = ttl ?? options?.ttl;
			if (t !== undefined && t !== 0) {
				const multi = redisCache.multi();
				for (const [key, value] of args) {
					if (!isCacheable(value))
						throw new NoCacheableError(`"${getVal(value)}" is not a cacheable value`);
					multi.set(key, getVal(value), 'PX', t);
				}
				await multi.exec();
			} else
				await redisCache.mset(
					args.flatMap(([key, value]) => {
						if (!isCacheable(value))
							throw new n8n_workflow_1.UnexpectedError(
								`"${getVal(value)}" is not a cacheable value`,
							);
						return [key, getVal(value)];
					}),
				);
		},
		mget: async (...args) =>
			await redisCache
				.mget(args)
				.then((results) =>
					results.map((result) =>
						result === null || result === undefined
							? undefined
							: (0, n8n_workflow_1.jsonParse)(result),
					),
				),
		async mdel(...args) {
			await redisCache.del(args);
		},
		async del(key) {
			await redisCache.del(key);
		},
		ttl: async (key) => await redisCache.pttl(key),
		keys: async (pattern = '*') => await keys(pattern),
		reset,
		isCacheable,
		get client() {
			return redisCache;
		},
		async hget(key, field) {
			const val = await redisCache.hget(key, field);
			if (val === undefined || val === null) return undefined;
			else return (0, n8n_workflow_1.jsonParse)(val);
		},
		async hgetall(key) {
			const val = await redisCache.hgetall(key);
			if (val === undefined || val === null) return undefined;
			else {
				for (const field in val) {
					const value = val[field];
					val[field] = (0, n8n_workflow_1.jsonParse)(value);
				}
				return val;
			}
		},
		async hset(key, fieldValueRecord) {
			for (const field in fieldValueRecord) {
				const value = fieldValueRecord[field];
				if (!isCacheable(fieldValueRecord[field])) {
					throw new NoCacheableError(`"${value}" is not a cacheable value`);
				}
				fieldValueRecord[field] = getVal(value);
			}
			await redisCache.hset(key, fieldValueRecord);
		},
		async hkeys(key) {
			return await redisCache.hkeys(key);
		},
		async hvals(key) {
			const values = await redisCache.hvals(key);
			return values.map((value) => (0, n8n_workflow_1.jsonParse)(value));
		},
		async hexists(key, field) {
			return (await redisCache.hexists(key, field)) === 1;
		},
		async hdel(key, field) {
			return await redisCache.hdel(key, field);
		},
	};
}
function redisStoreUsingClient(redisCache, options) {
	const reset = async () => {
		await redisCache.flushdb();
	};
	const keys = async (pattern) => await redisCache.keys(pattern);
	return builder(redisCache, reset, keys, options);
}
async function redisStore(options) {
	options ||= {};
	const redisCache =
		'clusterConfig' in options
			? new ioredis_1.default.Cluster(options.clusterConfig.nodes, options.clusterConfig.options)
			: new ioredis_1.default(options);
	return redisStoreUsingClient(redisCache, options);
}
//# sourceMappingURL=redis.cache-manager.js.map
