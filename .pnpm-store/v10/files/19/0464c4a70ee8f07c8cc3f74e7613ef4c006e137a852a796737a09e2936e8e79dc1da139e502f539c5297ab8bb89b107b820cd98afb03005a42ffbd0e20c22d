import { createClient } from "redis";

//#region src/connections.ts
var RedisConnectionPool = class {
	clients = /* @__PURE__ */ new Map();
	getClient(config = {}) {
		if (!this.clients.has(config)) this.clients.set(config, createClient(config));
		return this.clients.get(config);
	}
};
const pool = new RedisConnectionPool();

//#endregion
export { pool };
//# sourceMappingURL=connections.js.map