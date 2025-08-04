'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const nock_1 = __importDefault(require('nock'));
exports.default = async () => {
	nock_1.default.disableNetConnect();
	nock_1.default.enableNetConnect('127.0.0.1');
	process.env.N8N_LOG_LEVEL = 'silent';
	process.env.NODE_ENV = 'test';
	process.env.DB_SQLITE_POOL_SIZE = '1';
	process.env.DB_LOGGING_ENABLED = 'false';
	process.env.CACHE_REDIS_ENABLED = 'false';
	process.setMaxListeners(30);
	if (global.gc) {
		global.gc();
	}
};
//# sourceMappingURL=setup.js.map
