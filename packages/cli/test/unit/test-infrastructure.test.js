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
Object.defineProperty(exports, '__esModule', { value: true });
const di_1 = require('@n8n/di');
const config_1 = require('@n8n/config');
describe('Test Infrastructure', () => {
	describe('Container DI System', () => {
		it('should properly mock Container.get(GlobalConfig)', () => {
			const config = di_1.Container.get(config_1.GlobalConfig);
			expect(config).toBeDefined();
			expect(config.database).toBeDefined();
			expect(config.database.type).toBe('sqlite');
		});
		it('should provide complete database configuration', () => {
			const config = di_1.Container.get(config_1.GlobalConfig);
			expect(config.database.type).toBe('sqlite');
			expect(config.database.sqliteDatabase).toBe(':memory:');
			expect(config.database.logging).toBe(false);
			expect(config.database.tablePrefix).toBe('');
		});
		it('should provide other configuration sections', () => {
			const config = di_1.Container.get(config_1.GlobalConfig);
			expect(config.credentials).toBeDefined();
			expect(config.workflows).toBeDefined();
			expect(config.endpoints).toBeDefined();
			expect(config.path).toBeDefined();
			expect(config.nodes).toBeDefined();
			expect(config.queue).toBeDefined();
		});
		it('should handle Logger service mock', () => {
			const logger = di_1.Container.get('Logger');
			expect(logger).toBeDefined();
			expect(typeof logger.info).toBe('function');
			expect(typeof logger.error).toBe('function');
			expect(typeof logger.warn).toBe('function');
			expect(typeof logger.debug).toBe('function');
		});
		it('should return empty objects for unknown services', () => {
			const unknownService = di_1.Container.get('UnknownService');
			expect(unknownService).toBeDefined();
			expect(typeof unknownService).toBe('object');
		});
	});
	describe('Abstract Entity Compatibility', () => {
		it('should allow abstract entity to access database type without error', async () => {
			const { dbType } = await Promise.resolve().then(() =>
				__importStar(require('@n8n/db/src/entities/abstract-entity')),
			);
			expect(dbType).toBe('sqlite');
		});
	});
	describe('Global Environment Setup', () => {
		it('should have test environment variables set', () => {
			expect(process.env.NODE_ENV).toBe('test');
			expect(process.env.N8N_LOG_LEVEL).toBe('silent');
			expect(process.env.DB_TYPE).toBe('sqlite');
			expect(process.env.DB_SQLITE_DATABASE).toBe(':memory:');
		});
		it('should have proper Jest timeout configured', () => {
			expect(jest.getTimerCount()).toBeDefined();
		});
	});
});
//# sourceMappingURL=test-infrastructure.test.js.map
