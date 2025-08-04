'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const utils_1 = require('../utils');
describe('shouldAssignExecuteMethod', () => {
	it('should return true when node has no execute, poll, trigger, webhook (unless declarative), or methods', () => {
		const nodeType = {
			description: { requestDefaults: {} },
			execute: undefined,
			poll: undefined,
			trigger: undefined,
			webhook: undefined,
			methods: undefined,
		};
		expect((0, utils_1.shouldAssignExecuteMethod)(nodeType)).toBe(true);
	});
	it('should return false when node has execute', () => {
		const nodeType = {
			execute: jest.fn(),
		};
		expect((0, utils_1.shouldAssignExecuteMethod)(nodeType)).toBe(false);
	});
	it('should return false when node has poll', () => {
		const nodeType = {
			poll: jest.fn(),
		};
		expect((0, utils_1.shouldAssignExecuteMethod)(nodeType)).toBe(false);
	});
	it('should return false when node has trigger', () => {
		const nodeType = {
			trigger: jest.fn(),
		};
		expect((0, utils_1.shouldAssignExecuteMethod)(nodeType)).toBe(false);
	});
	it('should return false when node has webhook and is not declarative', () => {
		const nodeType = {
			description: {},
			webhook: jest.fn(),
		};
		expect((0, utils_1.shouldAssignExecuteMethod)(nodeType)).toBe(false);
	});
	it('should return true when node has webhook but is declarative', () => {
		const nodeType = {
			description: { requestDefaults: {} },
			webhook: jest.fn(),
		};
		expect((0, utils_1.shouldAssignExecuteMethod)(nodeType)).toBe(true);
	});
	it('should return false when node has methods and is not declarative', () => {
		const nodeType = {
			methods: {},
		};
		expect((0, utils_1.shouldAssignExecuteMethod)(nodeType)).toBe(false);
	});
	it('should return true when node has methods but is declarative', () => {
		const nodeType = {
			description: { requestDefaults: {} },
			methods: {},
		};
		expect((0, utils_1.shouldAssignExecuteMethod)(nodeType)).toBe(true);
	});
});
//# sourceMappingURL=utils.test.js.map
