const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const redis = require_rolldown_runtime.__toESM(require("redis"));

//#region src/connections.ts
var RedisConnectionPool = class {
	clients = /* @__PURE__ */ new Map();
	getClient(config = {}) {
		if (!this.clients.has(config)) this.clients.set(config, (0, redis.createClient)(config));
		return this.clients.get(config);
	}
};
const pool = new RedisConnectionPool();

//#endregion
exports.pool = pool;
//# sourceMappingURL=connections.cjs.map