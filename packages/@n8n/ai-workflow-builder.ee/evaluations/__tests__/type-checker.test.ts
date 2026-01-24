import { typeCheckCode } from '../../src/evaluators/code-typecheck/type-checker';
import {
	clearNodeTypeDeclarationsCache,
	getNodeTypeDeclarations,
} from '../../src/evaluators/code-typecheck/node-types-loader';

const validCode = `
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

return workflow('test-id', 'Test Workflow')
  .add(startTrigger);
`;

const codeWithTypeErrors = `
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

// Error: workflow() requires id and name arguments
return workflow()
  .add(startTrigger);
`;

const codeWithUndefinedFunction = `
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start' }
});

// Error: undefinedFunction does not exist
return undefinedFunction('test-id', 'Test Workflow')
  .add(startTrigger);
`;

describe('type-checker', () => {
	test('valid code should pass with no violations', () => {
		const result = typeCheckCode(validCode);
		console.log('Valid code - Score:', result.score);
		console.log('Valid code - Violations:', JSON.stringify(result.violations, null, 2));
		expect(result.score).toBe(1);
		expect(result.violations).toHaveLength(0);
	});

	test('code with type errors should have violations', () => {
		const result = typeCheckCode(codeWithTypeErrors);
		console.log('Type errors - Score:', result.score);
		console.log('Type errors - Violations:', JSON.stringify(result.violations, null, 2));
		expect(result.score).toBeLessThan(1);
		expect(result.violations.length).toBeGreaterThan(0);
	});

	test('code with undefined function should have violations', () => {
		const result = typeCheckCode(codeWithUndefinedFunction);
		console.log('Undefined function - Score:', result.score);
		console.log('Undefined function - Violations:', JSON.stringify(result.violations, null, 2));
		expect(result.score).toBeLessThan(1);
		expect(result.violations.length).toBeGreaterThan(0);
		expect(result.violations.some((v) => v.name === 'undefined-identifier')).toBe(true);
	});
});

describe('node-types-loader', () => {
	beforeEach(() => {
		// Clear cache before each test
		clearNodeTypeDeclarationsCache();
	});

	test('should load node type declarations', () => {
		const declarations = getNodeTypeDeclarations();
		expect(declarations).toBeDefined();
		expect(declarations.length).toBeGreaterThan(0);
		// Should contain KnownNodeType declaration
		expect(declarations).toContain('KnownNodeType');
	});

	test('should cache node type declarations', () => {
		const first = getNodeTypeDeclarations();
		const second = getNodeTypeDeclarations();
		// Should be the same reference (cached)
		expect(first).toBe(second);
	});
});

describe('type-checker with node type validation', () => {
	const codeWithInvalidNodeType = `
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start' }
});

// Error: 'invalid.nodeType' is not a valid node type
const invalidNode = node({
  type: 'invalid.nodeType',
  version: 1,
  config: { name: 'Invalid' }
});

return workflow('test-id', 'Test Workflow')
  .add(startTrigger)
  .then(invalidNode);
`;

	const codeWithValidHttpRequest = `
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start' }
});

const httpNode = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'HTTP Request',
    parameters: {
      url: 'https://api.example.com'
    }
  }
});

return workflow('test-id', 'Test Workflow')
  .add(startTrigger)
  .then(httpNode);
`;

	const codeWithValidSlack = `
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start' }
});

const slackNode = node({
  type: 'n8n-nodes-base.slack',
  version: 2.2,
  config: {
    name: 'Send Slack Message',
    parameters: {
      channel: '#general',
      text: 'Hello!'
    }
  }
});

return workflow('test-id', 'Test Workflow')
  .add(startTrigger)
  .then(slackNode);
`;

	test('should detect invalid node type', () => {
		const result = typeCheckCode(codeWithInvalidNodeType);
		console.log('Invalid node type - Score:', result.score);
		console.log('Invalid node type - Violations:', JSON.stringify(result.violations, null, 2));

		// Should have violations for invalid node type
		// The type 'invalid.nodeType' is not assignable to KnownNodeType
		expect(result.violations.length).toBeGreaterThan(0);
		expect(result.score).toBeLessThan(1);

		// Should have an incompatible type violation
		const hasTypeViolation = result.violations.some(
			(v) => v.name === 'incompatible-type' || v.description.includes('invalid.nodeType'),
		);
		expect(hasTypeViolation).toBe(true);
	});

	test('should accept valid httpRequest node type', () => {
		const result = typeCheckCode(codeWithValidHttpRequest);
		console.log('Valid httpRequest - Score:', result.score);
		console.log('Valid httpRequest - Violations:', JSON.stringify(result.violations, null, 2));

		// Should pass with no violations (or only minor ones)
		// Note: We're only validating node type names, not parameters
		expect(result.score).toBeGreaterThanOrEqual(0.7);
	});

	test('should accept valid slack node type', () => {
		const result = typeCheckCode(codeWithValidSlack);
		console.log('Valid slack - Score:', result.score);
		console.log('Valid slack - Violations:', JSON.stringify(result.violations, null, 2));

		// Should pass with no violations (or only minor ones)
		expect(result.score).toBeGreaterThanOrEqual(0.7);
	});
});
