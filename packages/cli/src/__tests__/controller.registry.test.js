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
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
jest.mock('@n8n/backend-common', () => {
	const actual = jest.requireActual('@n8n/backend-common');
	return {
		...actual,
		inProduction: true,
	};
});
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const express_1 = __importDefault(require('express'));
const jest_mock_extended_1 = require('jest-mock-extended');
const supertest_1 = require('supertest');
const controller_registry_1 = require('@/controller.registry');
describe('ControllerRegistry', () => {
	const license = (0, jest_mock_extended_1.mock)();
	const authService = (0, jest_mock_extended_1.mock)();
	const globalConfig = (0, jest_mock_extended_1.mock)({ endpoints: { rest: 'rest' } });
	const metadata = di_1.Container.get(decorators_1.ControllerRegistryMetadata);
	const lastActiveAtService = (0, jest_mock_extended_1.mock)();
	let agent;
	const authMiddleware = jest.fn().mockImplementation((_req, _res, next) => next());
	beforeEach(() => {
		jest.resetAllMocks();
		const app = (0, express_1.default)();
		authService.createAuthMiddleware.mockImplementation(() => authMiddleware);
		new controller_registry_1.ControllerRegistry(
			license,
			authService,
			globalConfig,
			metadata,
			lastActiveAtService,
		).activate(app);
		agent = (0, supertest_1.agent)(app);
	});
	describe('Rate limiting', () => {
		let TestController = class TestController {
			unlimited() {
				return { ok: true };
			}
			rateLimited() {
				return { ok: true };
			}
		};
		__decorate(
			[
				(0, decorators_1.Get)('/unlimited'),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestController.prototype,
			'unlimited',
			null,
		);
		__decorate(
			[
				(0, decorators_1.Get)('/rate-limited', { rateLimit: true }),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestController.prototype,
			'rateLimited',
			null,
		);
		TestController = __decorate([(0, decorators_1.RestController)('/test')], TestController);
		beforeEach(() => {
			authMiddleware.mockImplementation((_req, _res, next) => next());
			lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());
		});
		it('should not rate-limit by default', async () => {
			for (let i = 0; i < 6; i++) {
				await agent.get('/rest/test/unlimited').expect(200);
			}
		});
		it('should rate-limit when configured', async () => {
			for (let i = 0; i < 5; i++) {
				await agent.get('/rest/test/rate-limited').expect(200);
			}
			await agent.get('/rest/test/rate-limited').expect(429);
		});
	});
	describe('Authorization', () => {
		let TestController = class TestController {
			noAuth() {
				return { ok: true };
			}
			auth() {
				return { ok: true };
			}
		};
		__decorate(
			[
				(0, decorators_1.Get)('/no-auth', { skipAuth: true }),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestController.prototype,
			'noAuth',
			null,
		);
		__decorate(
			[
				(0, decorators_1.Get)('/auth'),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestController.prototype,
			'auth',
			null,
		);
		TestController = __decorate([(0, decorators_1.RestController)('/test')], TestController);
		it('should not require auth if configured to skip', async () => {
			await agent.get('/rest/test/no-auth').expect(200);
			expect(authMiddleware).not.toHaveBeenCalled();
		});
		it('should require auth by default', async () => {
			authMiddleware.mockImplementation((_req, res) => {
				res.status(401).send();
			});
			await agent.get('/rest/test/auth').expect(401);
			expect(authMiddleware).toHaveBeenCalled();
		});
	});
	describe('License checks', () => {
		let TestController = class TestController {
			sharing() {
				return { ok: true };
			}
		};
		__decorate(
			[
				(0, decorators_1.Get)('/with-sharing'),
				(0, decorators_1.Licensed)('feat:sharing'),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', []),
				__metadata('design:returntype', void 0),
			],
			TestController.prototype,
			'sharing',
			null,
		);
		TestController = __decorate([(0, decorators_1.RestController)('/test')], TestController);
		beforeEach(() => {
			authMiddleware.mockImplementation((_req, _res, next) => next());
			lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());
		});
		it('should disallow when feature is missing', async () => {
			license.isLicensed.calledWith('feat:sharing').mockReturnValue(false);
			await agent.get('/rest/test/with-sharing').expect(403);
			expect(license.isLicensed).toHaveBeenCalled();
		});
		it('should allow when feature is available', async () => {
			license.isLicensed.calledWith('feat:sharing').mockReturnValue(true);
			await agent.get('/rest/test/with-sharing').expect(200);
			expect(license.isLicensed).toHaveBeenCalled();
		});
	});
	describe('Args', () => {
		let TestController = class TestController {
			args(req, res, id) {
				res.setHeader('Testing', 'true');
				return { url: req.url, id };
			}
		};
		__decorate(
			[
				(0, decorators_1.Get)('/args/:id'),
				__param(2, (0, decorators_1.Param)('id')),
				__metadata('design:type', Function),
				__metadata('design:paramtypes', [Object, Object, String]),
				__metadata('design:returntype', void 0),
			],
			TestController.prototype,
			'args',
			null,
		);
		TestController = __decorate([(0, decorators_1.RestController)('/test')], TestController);
		beforeEach(() => {
			authMiddleware.mockImplementation((_req, _res, next) => next());
			lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());
		});
		it('should pass in correct args to the route handler', async () => {
			const response = await agent.get('/rest/test/args/1234').expect(200);
			expect(response.headers.testing).toBe('true');
			expect(response.body.data).toEqual({ url: '/args/1234', id: '1234' });
		});
	});
});
//# sourceMappingURL=controller.registry.test.js.map
