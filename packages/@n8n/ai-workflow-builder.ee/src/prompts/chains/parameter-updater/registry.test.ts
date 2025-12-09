import type { INodeTypeDescription } from 'n8n-workflow';

import {
	registerGuide,
	registerExamples,
	getMatchingGuides,
	getMatchingExamples,
	clearRegistry,
	matchesPattern,
} from './registry';
import type { PromptContext } from './types';

// Mock node definition for testing
const mockNodeDefinition: INodeTypeDescription = {
	displayName: 'Test Node',
	name: 'test-node',
	group: ['transform'],
	version: 1,
	description: 'Test',
	defaults: { name: 'Test' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

const createContext = (nodeType: string): PromptContext => ({
	nodeType,
	nodeDefinition: mockNodeDefinition,
	requestedChanges: [],
});

describe('matchesPattern', () => {
	describe('exact match', () => {
		it('should match exact node type', () => {
			expect(matchesPattern('n8n-nodes-base.set', 'n8n-nodes-base.set')).toBe(true);
		});

		it('should not match different node type', () => {
			expect(matchesPattern('n8n-nodes-base.if', 'n8n-nodes-base.set')).toBe(false);
		});
	});

	describe('suffix wildcard (*Tool)', () => {
		it('should match node ending with Tool', () => {
			expect(matchesPattern('gmailTool', '*Tool')).toBe(true);
			expect(matchesPattern('slackTool', '*Tool')).toBe(true);
			expect(matchesPattern('googleCalendarTool', '*Tool')).toBe(true);
		});

		it('should not match node not ending with Tool', () => {
			expect(matchesPattern('gmail', '*Tool')).toBe(false);
			expect(matchesPattern('toolbox', '*Tool')).toBe(false);
		});

		it('should be case-insensitive', () => {
			expect(matchesPattern('GmailTool', '*tool')).toBe(true);
			expect(matchesPattern('gmailTOOL', '*Tool')).toBe(true);
		});
	});

	describe('prefix wildcard (n8n-nodes-base.*)', () => {
		it('should match node starting with prefix', () => {
			expect(matchesPattern('n8n-nodes-base.set', 'n8n-nodes-base.*')).toBe(true);
			expect(matchesPattern('n8n-nodes-base.if', 'n8n-nodes-base.*')).toBe(true);
		});

		it('should not match node not starting with prefix', () => {
			expect(matchesPattern('@n8n/langchain.agent', 'n8n-nodes-base.*')).toBe(false);
		});
	});

	describe('substring match', () => {
		it('should match substring in node type', () => {
			expect(matchesPattern('n8n-nodes-base.set', '.set')).toBe(true);
			expect(matchesPattern('n8n-nodes-base.httpRequest', 'http')).toBe(true);
		});

		it('should be case-insensitive', () => {
			expect(matchesPattern('n8n-nodes-base.httpRequest', 'HTTP')).toBe(true);
		});
	});
});

describe('registry', () => {
	beforeEach(() => {
		clearRegistry();
	});

	describe('registerGuide and getMatchingGuides', () => {
		it('should register and retrieve a guide by exact pattern', () => {
			registerGuide({
				patterns: ['n8n-nodes-base.set'],
				content: 'Set node guide',
				priority: 30,
			});

			const guides = getMatchingGuides(createContext('n8n-nodes-base.set'));
			expect(guides).toHaveLength(1);
			expect(guides[0].content).toBe('Set node guide');
		});

		it('should return empty array when no guides match', () => {
			registerGuide({
				patterns: ['n8n-nodes-base.set'],
				content: 'Set node guide',
			});

			const guides = getMatchingGuides(createContext('n8n-nodes-base.if'));
			expect(guides).toHaveLength(0);
		});

		it('should match using wildcard patterns', () => {
			registerGuide({
				patterns: ['*Tool'],
				content: 'Tool node guide',
			});

			const guides = getMatchingGuides(createContext('gmailTool'));
			expect(guides).toHaveLength(1);
			expect(guides[0].content).toBe('Tool node guide');
		});

		it('should return multiple matching guides', () => {
			registerGuide({
				patterns: ['n8n-nodes-base.set'],
				content: 'Set node guide',
				priority: 30,
			});
			registerGuide({
				patterns: ['n8n-nodes-base.*'],
				content: 'General n8n guide',
				priority: 50,
			});

			const guides = getMatchingGuides(createContext('n8n-nodes-base.set'));
			expect(guides).toHaveLength(2);
		});

		it('should sort guides by priority (lower first)', () => {
			registerGuide({
				patterns: ['n8n-nodes-base.*'],
				content: 'Low priority',
				priority: 100,
			});
			registerGuide({
				patterns: ['n8n-nodes-base.*'],
				content: 'High priority',
				priority: 10,
			});
			registerGuide({
				patterns: ['n8n-nodes-base.*'],
				content: 'Medium priority',
				priority: 50,
			});

			const guides = getMatchingGuides(createContext('n8n-nodes-base.set'));
			expect(guides[0].content).toBe('High priority');
			expect(guides[1].content).toBe('Medium priority');
			expect(guides[2].content).toBe('Low priority');
		});

		it('should use default priority of 50 when not specified', () => {
			registerGuide({
				patterns: ['n8n-nodes-base.*'],
				content: 'With priority',
				priority: 40,
			});
			registerGuide({
				patterns: ['n8n-nodes-base.*'],
				content: 'Without priority',
			});

			const guides = getMatchingGuides(createContext('n8n-nodes-base.set'));
			expect(guides[0].content).toBe('With priority');
			expect(guides[1].content).toBe('Without priority');
		});

		it('should respect condition function', () => {
			registerGuide({
				patterns: ['*'],
				content: 'Conditional guide',
				condition: (ctx) => ctx.hasResourceLocatorParams === true,
			});

			const contextWithoutFlag = createContext('any-node');
			expect(getMatchingGuides(contextWithoutFlag)).toHaveLength(0);

			const contextWithFlag = { ...createContext('any-node'), hasResourceLocatorParams: true };
			expect(getMatchingGuides(contextWithFlag)).toHaveLength(1);
		});

		it('should match any of multiple patterns', () => {
			registerGuide({
				patterns: ['n8n-nodes-base.set', '.set', 'set'],
				content: 'Set guide',
			});

			expect(getMatchingGuides(createContext('n8n-nodes-base.set'))).toHaveLength(1);
			expect(getMatchingGuides(createContext('custom.set'))).toHaveLength(1);
			expect(getMatchingGuides(createContext('setter'))).toHaveLength(1);
		});
	});

	describe('registerExamples and getMatchingExamples', () => {
		it('should register and retrieve examples by pattern', () => {
			registerExamples({
				patterns: ['n8n-nodes-base.set'],
				content: 'Set node examples',
				priority: 30,
			});

			const examples = getMatchingExamples(createContext('n8n-nodes-base.set'));
			expect(examples).toHaveLength(1);
			expect(examples[0].content).toBe('Set node examples');
		});

		it('should sort examples by priority', () => {
			registerExamples({
				patterns: ['*'],
				content: 'Low priority',
				priority: 100,
			});
			registerExamples({
				patterns: ['*'],
				content: 'High priority',
				priority: 10,
			});

			const examples = getMatchingExamples(createContext('any-node'));
			expect(examples[0].content).toBe('High priority');
			expect(examples[1].content).toBe('Low priority');
		});

		it('should respect condition function for examples', () => {
			registerExamples({
				patterns: ['*'],
				content: 'Conditional examples',
				condition: (ctx) => ctx.requestedChanges.length > 0,
			});

			const contextNoChanges = createContext('any-node');
			expect(getMatchingExamples(contextNoChanges)).toHaveLength(0);

			const contextWithChanges = { ...createContext('any-node'), requestedChanges: ['change 1'] };
			expect(getMatchingExamples(contextWithChanges)).toHaveLength(1);
		});
	});
});
