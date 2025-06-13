import type { INodeType } from 'n8n-workflow';

import { shouldAssignExecuteMethod } from '../utils';

describe('shouldAssignExecuteMethod', () => {
	it('should return true when node has no execute, poll, trigger, webhook (unless declarative), or methods', () => {
		const nodeType = {
			description: { requestDefaults: {} }, // Declarative node
			execute: undefined,
			poll: undefined,
			trigger: undefined,
			webhook: undefined,
			methods: undefined,
		} as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(true);
	});

	it('should return false when node has execute', () => {
		const nodeType = {
			execute: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has poll', () => {
		const nodeType = {
			poll: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has trigger', () => {
		const nodeType = {
			trigger: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has webhook and is not declarative', () => {
		const nodeType = {
			description: {},
			webhook: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return true when node has webhook but is declarative', () => {
		const nodeType = {
			description: { requestDefaults: {} }, // Declarative node
			webhook: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(true);
	});

	it('should return false when node has methods', () => {
		const nodeType = {
			methods: {},
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});
});
