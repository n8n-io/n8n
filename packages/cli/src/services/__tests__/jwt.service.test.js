'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const jsonwebtoken_1 = __importDefault(require('jsonwebtoken'));
const config_1 = __importDefault(require('@/config'));
const jwt_service_1 = require('@/services/jwt.service');
describe('JwtService', () => {
	const iat = 1699984313;
	const jwtSecret = 'random-string';
	const payload = { sub: 1 };
	const signedToken =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTY5OTk4NDMxM30.xNZOAmcidW5ovEF_mwIOzCWkJ70FEO6MFNLK2QRDOeQ';
	const instanceSettings = (0, jest_mock_extended_1.mock)({ encryptionKey: 'test-key' });
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('secret initialization', () => {
		it('should read the secret from config, when set', () => {
			config_1.default.set('userManagement.jwtSecret', jwtSecret);
			const jwtService = new jwt_service_1.JwtService(instanceSettings);
			expect(jwtService.jwtSecret).toEqual(jwtSecret);
		});
		it('should derive the secret from encryption key when not set in config', () => {
			config_1.default.set('userManagement.jwtSecret', '');
			const jwtService = new jwt_service_1.JwtService(instanceSettings);
			expect(jwtService.jwtSecret).toEqual(
				'e9e2975005eddefbd31b2c04a0b0f2d9c37d9d718cf3676cddf76d65dec555cb',
			);
		});
	});
	describe('with a secret set', () => {
		config_1.default.set('userManagement.jwtSecret', jwtSecret);
		const jwtService = new jwt_service_1.JwtService(instanceSettings);
		beforeAll(() => {
			jest.useFakeTimers().setSystemTime(new Date(iat * 1000));
		});
		afterAll(() => jest.useRealTimers());
		it('should sign', () => {
			const token = jwtService.sign(payload);
			expect(token).toEqual(signedToken);
		});
		it('should decode and verify payload', () => {
			const decodedToken = jwtService.verify(signedToken);
			expect(decodedToken.sub).toEqual(1);
			expect(decodedToken.iat).toEqual(iat);
		});
		it('should throw an error on verify if the token is expired', () => {
			const expiredToken = jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn: -10 });
			expect(() => jwtService.verify(expiredToken)).toThrow(
				jsonwebtoken_1.default.TokenExpiredError,
			);
		});
	});
});
//# sourceMappingURL=jwt.service.test.js.map
