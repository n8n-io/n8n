import type { INodeTypeDescription } from 'n8n-workflow';

import { getMatchingGuides, getMatchingExamples, matchesPattern } from './registry';
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

const createContext = (nodeType: string, extras?: Partial<PromptContext>): PromptContext => ({
	nodeType,
	nodeDefinition: mockNodeDefinition,
	requestedChanges: [],
	...extras,
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

describe('getMatchingGuides', () => {
	it('should return Set node guide for Set nodes', () => {
		const guides = getMatchingGuides(createContext('n8n-nodes-base.set'));
		const setGuide = guides.find((g) => g.content.includes('Set Node Updates'));
		expect(setGuide).toBeDefined();
	});

	it('should return IF node guide for IF nodes', () => {
		const guides = getMatchingGuides(createContext('n8n-nodes-base.if'));
		const ifGuide = guides.find((g) => g.content.includes('IF node uses a complex filter'));
		expect(ifGuide).toBeDefined();
	});

	it('should return Switch node guide for Switch nodes', () => {
		const guides = getMatchingGuides(createContext('n8n-nodes-base.switch'));
		const switchGuide = guides.find((g) => g.content.includes('Switch Node Configuration'));
		expect(switchGuide).toBeDefined();
	});

	it('should return HTTP Request guide for HTTP Request nodes', () => {
		const guides = getMatchingGuides(createContext('n8n-nodes-base.httpRequest'));
		const httpGuide = guides.find((g) => g.content.includes('HTTP Request Node'));
		expect(httpGuide).toBeDefined();
	});

	it('should return Tool nodes guide for Tool nodes', () => {
		const guides = getMatchingGuides(createContext('gmailTool'));
		const toolGuide = guides.find((g) => g.content.includes('$fromAI Expression Support'));
		expect(toolGuide).toBeDefined();
	});

	it('should return resource locator guide when hasResourceLocatorParams is true', () => {
		const guidesWithout = getMatchingGuides(createContext('n8n-nodes-base.slack'));
		const resourceGuideWithout = guidesWithout.find((g) =>
			g.content.includes('ResourceLocator Parameter'),
		);
		expect(resourceGuideWithout).toBeUndefined();

		const guidesWith = getMatchingGuides(
			createContext('n8n-nodes-base.slack', { hasResourceLocatorParams: true }),
		);
		const resourceGuideWith = guidesWith.find((g) =>
			g.content.includes('ResourceLocator Parameter'),
		);
		expect(resourceGuideWith).toBeDefined();
	});

	it('should return multiple matching guides for a node', () => {
		// Set node should get: Set guide + Text fields guide (since mock has no properties, text fields won't match)
		const guides = getMatchingGuides(createContext('n8n-nodes-base.set'));
		expect(guides.length).toBeGreaterThanOrEqual(1);
	});
});

describe('getMatchingExamples', () => {
	it('should return Set node examples for Set nodes', () => {
		const examples = getMatchingExamples(createContext('n8n-nodes-base.set'));
		const setExamples = examples.find((e) => e.content.includes('Set Node Examples'));
		expect(setExamples).toBeDefined();
	});

	it('should return IF node examples for IF nodes', () => {
		const examples = getMatchingExamples(createContext('n8n-nodes-base.if'));
		const ifExamples = examples.find((e) => e.content.includes('IF Node Examples'));
		expect(ifExamples).toBeDefined();
	});

	it('should return Tool node examples for Tool nodes', () => {
		const examples = getMatchingExamples(createContext('gmailTool'));
		const toolExamples = examples.find((e) => e.content.includes('Tool Node Examples'));
		expect(toolExamples).toBeDefined();
	});

	it('should return simple update examples as fallback', () => {
		// Any node should get simple update examples
		const examples = getMatchingExamples(createContext('some-random-node'));
		const simpleExamples = examples.find((e) =>
			e.content.includes('Examples of Parameter Updates'),
		);
		expect(simpleExamples).toBeDefined();
	});

	it('should return resource locator examples when hasResourceLocatorParams is true', () => {
		const examplesWithout = getMatchingExamples(createContext('n8n-nodes-base.slack'));
		const resourceExamplesWithout = examplesWithout.find((e) =>
			e.content.includes('ResourceLocator Examples'),
		);
		expect(resourceExamplesWithout).toBeUndefined();

		const examplesWith = getMatchingExamples(
			createContext('n8n-nodes-base.slack', { hasResourceLocatorParams: true }),
		);
		const resourceExamplesWith = examplesWith.find((e) =>
			e.content.includes('ResourceLocator Examples'),
		);
		expect(resourceExamplesWith).toBeDefined();
	});
});
