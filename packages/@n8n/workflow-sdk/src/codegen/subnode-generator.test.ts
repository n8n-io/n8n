import { describe, it, expect } from '@jest/globals';
import type { IDataObject } from 'n8n-workflow';

import { generateSubnodeCall, generateSubnodesConfig, formatValue } from './subnode-generator';
import type { SemanticGraph, SemanticNode, AiConnectionType } from './types';

/**
 * Create a minimal semantic node for testing
 */
function createSemanticNode(
	name: string,
	type: string,
	subnodes: Array<{ connectionType: AiConnectionType; subnodeName: string }> = [],
	parameters?: IDataObject,
	position?: [number, number],
): SemanticNode {
	return {
		name,
		type,
		json: {
			id: name,
			name,
			type,
			typeVersion: 1,
			position: position ?? [0, 0],
			parameters,
		},
		outputs: new Map(),
		inputSources: new Map(),
		subnodes,
		annotations: {
			isTrigger: false,
			isCycleTarget: false,
			isConvergencePoint: false,
		},
	};
}

/**
 * Create a minimal generation context for testing
 */
function createGenerationContext(graph: SemanticGraph) {
	return {
		indent: 0,
		generatedVars: new Set<string>(),
		variableNodes: new Map<string, SemanticNode>(),
		graph,
		nodeNameToVarName: new Map<string, string>(),
		usedVarNames: new Set<string>(),
		subnodeVariables: new Map<string, { node: SemanticNode; builderName: string }>(),
	};
}

describe('generateSubnodeCall', () => {
	it('generates inline subnode call with type and version', () => {
		const node = createSemanticNode('Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi');
		const graph: SemanticGraph = {
			nodes: new Map([['Model', node]]),
			roots: [],
			cycleEdges: new Map(),
		};
		const ctx = createGenerationContext(graph);

		const result = generateSubnodeCall(node, 'languageModel', ctx, { useVarRefs: false });

		expect(result).toContain("type: '@n8n/n8n-nodes-langchain.lmChatOpenAi'");
		expect(result).toContain('version: 1');
		expect(result).toContain('languageModel({');
	});

	it('includes name when different from default', () => {
		const node = createSemanticNode('MyCustomModel', '@n8n/n8n-nodes-langchain.lmChatOpenAi');
		const graph: SemanticGraph = {
			nodes: new Map([['MyCustomModel', node]]),
			roots: [],
			cycleEdges: new Map(),
		};
		const ctx = createGenerationContext(graph);

		const result = generateSubnodeCall(node, 'languageModel', ctx, { useVarRefs: false });

		expect(result).toContain("name: 'MyCustomModel'");
	});

	it('includes parameters when present', () => {
		const node = createSemanticNode('Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi', [], {
			temperature: 0.7,
		});
		const graph: SemanticGraph = {
			nodes: new Map([['Model', node]]),
			roots: [],
			cycleEdges: new Map(),
		};
		const ctx = createGenerationContext(graph);

		const result = generateSubnodeCall(node, 'languageModel', ctx, { useVarRefs: false });

		expect(result).toContain('parameters:');
		expect(result).toContain('temperature');
	});

	it('includes position when non-zero', () => {
		const node = createSemanticNode(
			'Model',
			'@n8n/n8n-nodes-langchain.lmChatOpenAi',
			[],
			undefined,
			[100, 200],
		);
		const graph: SemanticGraph = {
			nodes: new Map([['Model', node]]),
			roots: [],
			cycleEdges: new Map(),
		};
		const ctx = createGenerationContext(graph);

		const result = generateSubnodeCall(node, 'languageModel', ctx, { useVarRefs: false });

		expect(result).toContain('position: [100, 200]');
	});

	it('uses variable references when useVarRefs=true', () => {
		// Create parent with nested subnode
		const nestedSubnode = createSemanticNode(
			'NestedModel',
			'@n8n/n8n-nodes-langchain.lmChatOpenAi',
		);
		const parentSubnode = createSemanticNode('Tool', '@n8n/n8n-nodes-langchain.toolWorkflow', [
			{ connectionType: 'ai_languageModel', subnodeName: 'NestedModel' },
		]);

		const graph: SemanticGraph = {
			nodes: new Map([
				['Tool', parentSubnode],
				['NestedModel', nestedSubnode],
			]),
			roots: [],
			cycleEdges: new Map(),
		};
		const ctx = createGenerationContext(graph);
		// Register nested subnode as variable
		ctx.nodeNameToVarName.set('NestedModel', 'nestedModel');

		const result = generateSubnodeCall(parentSubnode, 'tool', ctx, { useVarRefs: true });

		// Should reference variable, not inline call
		expect(result).toContain('subnodes:');
		expect(result).toContain('model: nestedModel');
	});
});

describe('generateSubnodesConfig', () => {
	it('generates config for single subnode', () => {
		const subnode = createSemanticNode('Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi');
		const parent = createSemanticNode('Agent', '@n8n/n8n-nodes-langchain.agent', [
			{ connectionType: 'ai_languageModel', subnodeName: 'Model' },
		]);

		const graph: SemanticGraph = {
			nodes: new Map([
				['Agent', parent],
				['Model', subnode],
			]),
			roots: ['Agent'],
			cycleEdges: new Map(),
		};
		const ctx = createGenerationContext(graph);

		const result = generateSubnodesConfig(parent, ctx, { useVarRefs: false });

		expect(result).not.toBeNull();
		expect(result).toContain('model:');
		expect(result).toContain('languageModel({');
	});

	it('generates config for multiple tools as array', () => {
		const tool1 = createSemanticNode('Tool1', '@n8n/n8n-nodes-langchain.toolWorkflow');
		const tool2 = createSemanticNode('Tool2', '@n8n/n8n-nodes-langchain.toolWorkflow');
		const parent = createSemanticNode('Agent', '@n8n/n8n-nodes-langchain.agent', [
			{ connectionType: 'ai_tool', subnodeName: 'Tool1' },
			{ connectionType: 'ai_tool', subnodeName: 'Tool2' },
		]);

		const graph: SemanticGraph = {
			nodes: new Map([
				['Agent', parent],
				['Tool1', tool1],
				['Tool2', tool2],
			]),
			roots: ['Agent'],
			cycleEdges: new Map(),
		};
		const ctx = createGenerationContext(graph);

		const result = generateSubnodesConfig(parent, ctx, { useVarRefs: false });

		expect(result).not.toBeNull();
		expect(result).toContain('tools: [');
	});

	it('returns null when no subnodes', () => {
		const node = createSemanticNode('Node', 'n8n-nodes-base.noOp');

		const graph: SemanticGraph = {
			nodes: new Map([['Node', node]]),
			roots: ['Node'],
			cycleEdges: new Map(),
		};
		const ctx = createGenerationContext(graph);

		const result = generateSubnodesConfig(node, ctx, { useVarRefs: false });

		expect(result).toBeNull();
	});

	it('uses variable names when useVarRefs=true', () => {
		const subnode = createSemanticNode('Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi');
		const parent = createSemanticNode('Agent', '@n8n/n8n-nodes-langchain.agent', [
			{ connectionType: 'ai_languageModel', subnodeName: 'Model' },
		]);

		const graph: SemanticGraph = {
			nodes: new Map([
				['Agent', parent],
				['Model', subnode],
			]),
			roots: ['Agent'],
			cycleEdges: new Map(),
		};
		const ctx = createGenerationContext(graph);
		// Register subnode variable name
		ctx.nodeNameToVarName.set('Model', 'model');

		const result = generateSubnodesConfig(parent, ctx, { useVarRefs: true });

		expect(result).not.toBeNull();
		expect(result).toContain('model: model');
		// Should NOT contain inline languageModel call
		expect(result).not.toContain('languageModel({');
	});
});

describe('formatValue', () => {
	it('formats placeholder values as placeholder() function calls', () => {
		const placeholderString = '<__PLACEHOLDER_VALUE__Enter Slack Channel__>';

		const result = formatValue(placeholderString);

		expect(result).toBe("placeholder('Enter Slack Channel')");
	});

	it('formats placeholder values with special characters in hint', () => {
		const placeholderString = "<__PLACEHOLDER_VALUE__Enter your API key (e.g., 'sk-xxx')__>";

		const result = formatValue(placeholderString);

		expect(result).toBe("placeholder('Enter your API key (e.g., \\'sk-xxx\\')')");
	});

	it('formats placeholder values nested in objects', () => {
		const obj = {
			channel: '<__PLACEHOLDER_VALUE__Select a channel__>',
			message: 'Hello',
		};

		const result = formatValue(obj);

		expect(result).toContain("channel: placeholder('Select a channel')");
		expect(result).toContain("message: 'Hello'");
	});

	it('formats placeholder values nested in arrays', () => {
		const arr = ['<__PLACEHOLDER_VALUE__First item__>', 'regular string'];

		const result = formatValue(arr);

		expect(result).toContain("placeholder('First item')");
		expect(result).toContain("'regular string'");
	});

	it('formats expressions as expr() function calls', () => {
		const expression = '={{ $json.name }}';

		const result = formatValue(expression);

		expect(result).toBe("expr('{{ $json.name }}')");
	});

	it('formats regular strings as quoted strings', () => {
		const regularString = 'Hello World';

		const result = formatValue(regularString);

		expect(result).toBe("'Hello World'");
	});

	describe('expression annotations', () => {
		it('renders @example as block comment on line before expression', () => {
			const expression = '={{ $json.name }}';
			const annotations = new Map([[expression, '"John Doe"']]);

			const result = formatValue(expression, { expressionAnnotations: annotations });

			expect(result).toBe('/** @example "John Doe" */\nexpr(\'{{ $json.name }}\')');
		});

		it('renders @example with newlines in block comment', () => {
			const expression = '={{ $json.weather }}';
			const annotationWithNewlines = '"Today\'s weather:\nTemperature: 20°C"';
			const annotations = new Map([[expression, annotationWithNewlines]]);

			const result = formatValue(expression, { expressionAnnotations: annotations });

			expect(result).toBe(
				"/** @example \"Today's weather:\nTemperature: 20°C\" */\nexpr('{{ $json.weather }}')",
			);
		});

		it('renders @example for regular strings with annotations', () => {
			const regularString = 'static value';
			const annotations = new Map([[regularString, '"resolved"']]);

			const result = formatValue(regularString, { expressionAnnotations: annotations });

			expect(result).toBe('/** @example "resolved" */\n\'static value\'');
		});
	});
});
