import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
	extractPlaceholderLabels,
	findPlaceholderDetails,
	formatPlaceholderPath,
	isPlaceholderValue,
	useBuilderTodos,
} from './useBuilderTodos';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi } from '@/Interface';

vi.mock('@n8n/i18n', async (importActual) => ({
	...(await importActual()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key}: ${JSON.stringify(options.interpolate)}` : key,
	}),
}));

describe('useBuilderTodos', () => {
	describe('extractPlaceholderLabels', () => {
		it('returns empty array for non-string values', () => {
			expect(extractPlaceholderLabels(123)).toEqual([]);
			expect(extractPlaceholderLabels(true)).toEqual([]);
			expect(extractPlaceholderLabels(null)).toEqual([]);
			expect(extractPlaceholderLabels(undefined)).toEqual([]);
			expect(extractPlaceholderLabels({})).toEqual([]);
			expect(extractPlaceholderLabels([])).toEqual([]);
		});

		it('returns empty array for strings without placeholder format', () => {
			expect(extractPlaceholderLabels('regular string')).toEqual([]);
			expect(extractPlaceholderLabels('https://example.com')).toEqual([]);
			expect(extractPlaceholderLabels('')).toEqual([]);
		});

		it('returns empty array for partial placeholder format', () => {
			expect(extractPlaceholderLabels('<__PLACEHOLDER_VALUE__missing end')).toEqual([]);
			expect(extractPlaceholderLabels('PLACEHOLDER__test__>')).toEqual([]);
			expect(extractPlaceholderLabels('__PLACEHOLDER_VALUE__test__>')).toEqual([]);
		});

		it('returns empty array for empty label', () => {
			expect(extractPlaceholderLabels('<__PLACEHOLDER_VALUE____>')).toEqual([]);
		});

		it('returns empty array for whitespace-only label', () => {
			expect(extractPlaceholderLabels('<__PLACEHOLDER_VALUE__   __>')).toEqual([]);
		});

		it('extracts label from valid placeholder', () => {
			expect(extractPlaceholderLabels('<__PLACEHOLDER_VALUE__Enter URL__>')).toEqual(['Enter URL']);
			expect(extractPlaceholderLabels('<__PLACEHOLDER_VALUE__API Key__>')).toEqual(['API Key']);
		});

		it('trims whitespace from label', () => {
			expect(extractPlaceholderLabels('<__PLACEHOLDER_VALUE__  Enter URL  __>')).toEqual([
				'Enter URL',
			]);
		});

		it('extracts single embedded placeholder from code', () => {
			const code = "const apiKey = '<__PLACEHOLDER_VALUE__API_KEY__>';";
			expect(extractPlaceholderLabels(code)).toEqual(['API_KEY']);
		});

		it('extracts multiple embedded placeholders from code', () => {
			const code = `
				const apiKey = '<__PLACEHOLDER_VALUE__API_KEY__>';
				const endpoint = '<__PLACEHOLDER_VALUE__API_ENDPOINT__>';
			`;
			expect(extractPlaceholderLabels(code)).toEqual(['API_KEY', 'API_ENDPOINT']);
		});

		it('handles placeholders in complex code', () => {
			const code = `
				// This is a comment
				function getData() {
					const url = '<__PLACEHOLDER_VALUE__Base URL__>' + '/api/data';
					const headers = {
						'Authorization': 'Bearer <__PLACEHOLDER_VALUE__API Token__>'
					};
					return fetch(url, { headers });
				}
			`;
			expect(extractPlaceholderLabels(code)).toEqual(['Base URL', 'API Token']);
		});

		it('extracts label from alternative placeholder format with colon', () => {
			expect(extractPlaceholderLabels('<__PLACEHOLDER__: Add your custom code here__>')).toEqual([
				'Add your custom code here',
			]);
		});

		it('extracts labels from mixed placeholder formats', () => {
			const code = `
				const apiKey = '<__PLACEHOLDER_VALUE__API_KEY__>';
				const customCode = '<__PLACEHOLDER__: Add your code here__>';
			`;
			expect(extractPlaceholderLabels(code)).toEqual(['API_KEY', 'Add your code here']);
		});
	});

	describe('findPlaceholderDetails', () => {
		it('returns empty array for primitive non-placeholder values', () => {
			expect(findPlaceholderDetails('regular string')).toEqual([]);
			expect(findPlaceholderDetails(123)).toEqual([]);
			expect(findPlaceholderDetails(true)).toEqual([]);
			expect(findPlaceholderDetails(null)).toEqual([]);
		});

		it('returns empty array for empty object', () => {
			expect(findPlaceholderDetails({})).toEqual([]);
		});

		it('returns empty array for empty array', () => {
			expect(findPlaceholderDetails([])).toEqual([]);
		});

		it('finds placeholder at root level', () => {
			const result = findPlaceholderDetails('<__PLACEHOLDER_VALUE__Enter URL__>');
			expect(result).toEqual([{ path: [], label: 'Enter URL' }]);
		});

		it('finds placeholder in simple object', () => {
			const result = findPlaceholderDetails({
				url: '<__PLACEHOLDER_VALUE__Enter URL__>',
			});
			expect(result).toEqual([{ path: ['url'], label: 'Enter URL' }]);
		});

		it('finds multiple placeholders in object', () => {
			const result = findPlaceholderDetails({
				url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				body: '<__PLACEHOLDER_VALUE__Enter Body__>',
			});
			expect(result).toHaveLength(2);
			expect(result).toContainEqual({ path: ['url'], label: 'Enter URL' });
			expect(result).toContainEqual({ path: ['body'], label: 'Enter Body' });
		});

		it('finds placeholder in nested object', () => {
			const result = findPlaceholderDetails({
				options: {
					headers: {
						authorization: '<__PLACEHOLDER_VALUE__Enter API Key__>',
					},
				},
			});
			expect(result).toEqual([
				{ path: ['options', 'headers', 'authorization'], label: 'Enter API Key' },
			]);
		});

		it('finds placeholder in array', () => {
			const result = findPlaceholderDetails([
				'regular value',
				'<__PLACEHOLDER_VALUE__Enter Value__>',
			]);
			expect(result).toEqual([{ path: ['[1]'], label: 'Enter Value' }]);
		});

		it('finds placeholder in array of objects', () => {
			const result = findPlaceholderDetails({
				headers: [
					{ name: 'Content-Type', value: 'application/json' },
					{ name: 'Authorization', value: '<__PLACEHOLDER_VALUE__Enter Token__>' },
				],
			});
			expect(result).toEqual([{ path: ['headers', '[1]', 'value'], label: 'Enter Token' }]);
		});

		it('finds placeholders in mixed structure', () => {
			const result = findPlaceholderDetails({
				url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				options: {
					items: [{ key: '<__PLACEHOLDER_VALUE__Enter Key__>' }, { value: 'static' }],
				},
			});
			expect(result).toHaveLength(2);
			expect(result).toContainEqual({ path: ['url'], label: 'Enter URL' });
			expect(result).toContainEqual({
				path: ['options', 'items', '[0]', 'key'],
				label: 'Enter Key',
			});
		});

		it('ignores non-placeholder strings in object', () => {
			const result = findPlaceholderDetails({
				url: 'https://example.com',
				method: 'GET',
				placeholder: '<__PLACEHOLDER_VALUE__Enter Value__>',
			});
			expect(result).toEqual([{ path: ['placeholder'], label: 'Enter Value' }]);
		});

		it('handles custom starting path', () => {
			const result = findPlaceholderDetails({ url: '<__PLACEHOLDER_VALUE__Enter URL__>' }, [
				'parameters',
			]);
			expect(result).toEqual([{ path: ['parameters', 'url'], label: 'Enter URL' }]);
		});

		it('finds embedded placeholder in code string', () => {
			const result = findPlaceholderDetails({
				jsCode: "const apiKey = '<__PLACEHOLDER_VALUE__API_KEY__>';",
			});
			expect(result).toEqual([{ path: ['jsCode'], label: 'API_KEY' }]);
		});

		it('finds multiple embedded placeholders in code string', () => {
			const code = `
				const apiKey = '<__PLACEHOLDER_VALUE__API_KEY__>';
				const endpoint = '<__PLACEHOLDER_VALUE__API_ENDPOINT__>';
			`;
			const result = findPlaceholderDetails({ jsCode: code });
			expect(result).toHaveLength(2);
			expect(result).toContainEqual({ path: ['jsCode'], label: 'API_KEY' });
			expect(result).toContainEqual({ path: ['jsCode'], label: 'API_ENDPOINT' });
		});

		it('finds embedded placeholders in Code node parameters', () => {
			const result = findPlaceholderDetails({
				mode: 'runOnceForAllItems',
				language: 'javaScript',
				jsCode: `
					// Fetch data from API
					const response = await fetch('<__PLACEHOLDER_VALUE__API URL__>');
					return response.json();
				`,
			});
			expect(result).toEqual([{ path: ['jsCode'], label: 'API URL' }]);
		});

		it('finds embedded placeholders in Python code', () => {
			const result = findPlaceholderDetails({
				pythonCode: "api_key = '<__PLACEHOLDER_VALUE__Python API Key__>'",
			});
			expect(result).toEqual([{ path: ['pythonCode'], label: 'Python API Key' }]);
		});
	});

	describe('formatPlaceholderPath', () => {
		it('returns "parameters" for empty path', () => {
			expect(formatPlaceholderPath([])).toBe('parameters');
		});

		it('formats single segment path', () => {
			expect(formatPlaceholderPath(['url'])).toBe('url');
		});

		it('formats multi-segment path with dot notation', () => {
			expect(formatPlaceholderPath(['options', 'headers', 'authorization'])).toBe(
				'options.headers.authorization',
			);
		});

		it('formats path with array indices without leading dot', () => {
			expect(formatPlaceholderPath(['headers', '[0]', 'value'])).toBe('headers[0].value');
		});

		it('formats path starting with array index', () => {
			expect(formatPlaceholderPath(['[0]', 'key'])).toBe('[0].key');
		});

		it('formats path with multiple array indices', () => {
			expect(formatPlaceholderPath(['items', '[0]', 'options', '[1]', 'value'])).toBe(
				'items[0].options[1].value',
			);
		});

		it('formats path with consecutive array indices', () => {
			expect(formatPlaceholderPath(['matrix', '[0]', '[1]'])).toBe('matrix[0][1]');
		});
	});

	describe('isPlaceholderValue', () => {
		it('returns true for placeholder values', () => {
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__API endpoint URL__>')).toBe(true);
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__label__>')).toBe(true);
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE____>')).toBe(true);
		});

		it('returns false for non-placeholder strings', () => {
			expect(isPlaceholderValue('regular string')).toBe(false);
			expect(isPlaceholderValue('')).toBe(false);
			expect(isPlaceholderValue('https://api.example.com')).toBe(false);
			expect(isPlaceholderValue('={{ $json.field }}')).toBe(false);
		});

		it('returns false for malformed placeholders missing suffix', () => {
			// Has prefix but missing suffix - should be false
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__missing suffix')).toBe(false);
			expect(isPlaceholderValue('<__PLACEHOLDER_VALUE__some text without end')).toBe(false);
		});

		it('returns false for malformed placeholders missing prefix', () => {
			// Has suffix but missing prefix - should be false
			expect(isPlaceholderValue('missing prefix__>')).toBe(false);
			expect(isPlaceholderValue('some text without start__>')).toBe(false);
		});

		it('returns false for non-string values', () => {
			expect(isPlaceholderValue(123)).toBe(false);
			expect(isPlaceholderValue(null)).toBe(false);
			expect(isPlaceholderValue(undefined)).toBe(false);
			expect(isPlaceholderValue({ key: 'value' })).toBe(false);
			expect(isPlaceholderValue(['array'])).toBe(false);
			expect(isPlaceholderValue(true)).toBe(false);
		});
	});

	describe('workflowTodos composable', () => {
		const createMockNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
			({
				id: 'node-1',
				name: 'Test Node',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				...overrides,
			}) as INodeUi;

		beforeEach(() => {
			setActivePinia(createPinia());
		});

		it('excludes placeholder issues from pinned nodes', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup a node with placeholder in parameters
			const nodeWithPlaceholder = createMockNode({
				name: 'HTTP Request',
				parameters: {
					url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				},
			});

			// Set the workflow with the node and pin data for it
			workflowsStore.workflow.nodes = [nodeWithPlaceholder];
			workflowsStore.workflow.pinData = {
				'HTTP Request': [{ json: { data: 'pinned result' } }],
			};

			const { workflowTodos } = useBuilderTodos();

			// Since the node has pinned data, the placeholder issue should be excluded
			expect(workflowTodos.value).toHaveLength(0);
		});

		it('includes placeholder issues from non-pinned nodes', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup a node with placeholder in parameters
			const nodeWithPlaceholder = createMockNode({
				name: 'HTTP Request',
				parameters: {
					url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				},
			});

			// Set the workflow with the node but NO pin data
			workflowsStore.workflow.nodes = [nodeWithPlaceholder];
			workflowsStore.workflow.pinData = {};

			const { workflowTodos } = useBuilderTodos();

			// Since the node has no pinned data, the placeholder issue should be included
			expect(workflowTodos.value).toHaveLength(1);
			expect(workflowTodos.value[0].node).toBe('HTTP Request');
		});

		it('excludes validation issues from pinned nodes', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup a connected node with credential issues
			const nodeWithIssues = createMockNode({
				name: 'HTTP Request',
				issues: {
					credentials: {
						httpBasicAuth: ['Credentials not set'],
					},
				},
			});

			// Set the workflow with connections (node must be connected for issues to count)
			workflowsStore.workflow.nodes = [nodeWithIssues];
			workflowsStore.workflow.connections = {
				'HTTP Request': {
					main: [[{ node: 'Other Node', type: 'main' as const, index: 0 }]],
				},
			};
			workflowsStore.workflow.pinData = {
				'HTTP Request': [{ json: { data: 'pinned result' } }],
			};

			const { workflowTodos } = useBuilderTodos();

			// Since the node has pinned data, the credential issue should be excluded
			expect(workflowTodos.value).toHaveLength(0);
		});

		it('excludes credential issues from pinned AI model nodes with incoming connections', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup an AI model node with credential issues (like OpenAI GPT-4o-mini)
			const aiModelNode = createMockNode({
				name: 'OpenAI GPT-4o-mini',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				issues: {
					credentials: {
						openAiApi: ['Credentials not set'],
					},
				},
			});

			const agentNode = createMockNode({
				id: 'agent-1',
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
			});

			// Connections are stored by SOURCE node. AI Agent connects TO the model node.
			// This gives the model node an INCOMING connection.
			workflowsStore.workflow.nodes = [aiModelNode, agentNode];
			workflowsStore.workflow.connections = {
				'AI Agent': {
					ai_languageModel: [
						[{ node: 'OpenAI GPT-4o-mini', type: 'ai_languageModel' as const, index: 0 }],
					],
				},
			};
			workflowsStore.workflow.pinData = {
				'OpenAI GPT-4o-mini': [{ json: { response: 'pinned AI response' } }],
			};

			// Verify the issue exists in workflowValidationIssues before filtering
			const validationIssues = workflowsStore.workflowValidationIssues;
			expect(validationIssues.some((i) => i.node === 'OpenAI GPT-4o-mini')).toBe(true);

			const { workflowTodos } = useBuilderTodos();

			// Since the node has pinned data, the credential issue should be excluded
			expect(workflowTodos.value).toHaveLength(0);
		});

		it('excludes credential issues from sub-nodes when parent node has pinned data', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup: AI model sub-node with credential issues
			const aiModelSubNode = createMockNode({
				name: 'OpenAI GPT-4.1-mini',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				issues: {
					credentials: {
						openAiApi: ['Credentials not set'],
					},
				},
			});

			// Parent node (AI Agent) that the sub-node outputs to
			const parentNode = createMockNode({
				id: 'parent-1',
				name: 'Analyze Emails',
				type: '@n8n/n8n-nodes-langchain.agent',
			});

			workflowsStore.workflow.nodes = [aiModelSubNode, parentNode];

			// Sub-node outputs TO the parent node (stored by source node)
			workflowsStore.workflow.connections = {
				'OpenAI GPT-4.1-mini': {
					ai_languageModel: [
						[{ node: 'Analyze Emails', type: 'ai_languageModel' as const, index: 0 }],
					],
				},
			};

			// Parent node has pinned data, but sub-node does NOT
			workflowsStore.workflow.pinData = {
				'Analyze Emails': [{ json: { response: 'pinned response' } }],
			};

			// Verify validation issue exists for the sub-node
			const validationIssues = workflowsStore.workflowValidationIssues;
			expect(validationIssues.some((i) => i.node === 'OpenAI GPT-4.1-mini')).toBe(true);

			const { workflowTodos } = useBuilderTodos();

			// Sub-node's credential issue should be excluded because parent has pinned data
			expect(workflowTodos.value).toHaveLength(0);
		});

		it('excludes credential issues from nested sub-nodes when ancestor has pinned data', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup: Nested sub-node structure
			// grandparentNode (has pinned data) <- parentSubNode <- childSubNode (has credential issues)
			const childSubNode = createMockNode({
				name: 'Child Tool',
				type: '@n8n/n8n-nodes-langchain.tool',
				issues: {
					credentials: {
						toolApi: ['Credentials not set'],
					},
				},
			});

			const parentSubNode = createMockNode({
				id: 'parent-sub-1',
				name: 'AI Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			});

			const grandparentNode = createMockNode({
				id: 'grandparent-1',
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
			});

			workflowsStore.workflow.nodes = [childSubNode, parentSubNode, grandparentNode];

			// Child outputs to parent, parent outputs to grandparent
			workflowsStore.workflow.connections = {
				'Child Tool': {
					ai_tool: [[{ node: 'AI Model', type: 'ai_tool' as const, index: 0 }]],
				},
				'AI Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel' as const, index: 0 }]],
				},
			};

			// Only grandparent has pinned data
			workflowsStore.workflow.pinData = {
				'AI Agent': [{ json: { response: 'pinned response' } }],
			};

			const { workflowTodos } = useBuilderTodos();

			// Child sub-node's credential issue should be excluded because ancestor has pinned data
			expect(workflowTodos.value).toHaveLength(0);
		});

		it('verifies pinData structure is correct for filtering', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup pinData with various structures to verify filtering works
			const nodeWithIssues = createMockNode({
				name: 'Test Node',
				issues: {
					credentials: {
						testCred: ['Credentials not set'],
					},
				},
			});

			workflowsStore.workflow.nodes = [nodeWithIssues];
			workflowsStore.workflow.connections = {
				'Test Node': {
					main: [[{ node: 'Other', type: 'main' as const, index: 0 }]],
				},
			};

			// Verify pinData must have array with length > 0 to be considered pinned
			const { workflowTodos } = useBuilderTodos();

			// No pinData - should show issue
			workflowsStore.workflow.pinData = {};
			expect(workflowTodos.value).toHaveLength(1);

			// Empty array - should still show issue
			workflowsStore.workflow.pinData = { 'Test Node': [] };
			expect(workflowTodos.value).toHaveLength(1);

			// Non-empty array - should hide issue
			workflowsStore.workflow.pinData = { 'Test Node': [{ json: { data: 'test' } }] };
			expect(workflowTodos.value).toHaveLength(0);
		});

		it('includes validation issues from non-pinned nodes', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup a connected node with credential issues
			const nodeWithIssues = createMockNode({
				name: 'HTTP Request',
				issues: {
					credentials: {
						httpBasicAuth: ['Credentials not set'],
					},
				},
			});

			// Set the workflow with connections (node must be connected for issues to count)
			workflowsStore.workflow.nodes = [nodeWithIssues];
			workflowsStore.workflow.connections = {
				'HTTP Request': {
					main: [[{ node: 'Other Node', type: 'main' as const, index: 0 }]],
				},
			};
			workflowsStore.workflow.pinData = {};

			const { workflowTodos } = useBuilderTodos();

			// Since the node has no pinned data, the credential issue should be included
			expect(workflowTodos.value).toHaveLength(1);
			expect(workflowTodos.value[0].node).toBe('HTTP Request');
		});

		it('handles mixed pinned and non-pinned nodes correctly', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup two nodes: one pinned with issues, one not pinned with issues
			const pinnedNode = createMockNode({
				name: 'Pinned Node',
				parameters: {
					url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				},
			});

			const unpinnedNode = createMockNode({
				name: 'Unpinned Node',
				parameters: {
					apiKey: '<__PLACEHOLDER_VALUE__Enter API Key__>',
				},
			});

			workflowsStore.workflow.nodes = [pinnedNode, unpinnedNode];
			workflowsStore.workflow.pinData = {
				'Pinned Node': [{ json: { data: 'pinned result' } }],
				// 'Unpinned Node' has no pinned data
			};

			const { workflowTodos } = useBuilderTodos();

			// Only the unpinned node's issue should be included
			expect(workflowTodos.value).toHaveLength(1);
			expect(workflowTodos.value[0].node).toBe('Unpinned Node');
		});

		it('excludes placeholder issues from disabled nodes', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup a disabled node with placeholder in parameters
			const disabledNode = createMockNode({
				name: 'HTTP Request',
				disabled: true,
				parameters: {
					url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				},
			});

			workflowsStore.workflow.nodes = [disabledNode];
			workflowsStore.workflow.pinData = {};

			const { workflowTodos } = useBuilderTodos();

			// Since the node is disabled, the placeholder issue should be excluded
			expect(workflowTodos.value).toHaveLength(0);
		});

		it('excludes validation issues from disabled nodes', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup a disabled node with credential issues
			const disabledNode = createMockNode({
				name: 'HTTP Request',
				disabled: true,
				issues: {
					credentials: {
						httpBasicAuth: ['Credentials not set'],
					},
				},
			});

			workflowsStore.workflow.nodes = [disabledNode];
			workflowsStore.workflow.connections = {
				'HTTP Request': {
					main: [[{ node: 'Other Node', type: 'main' as const, index: 0 }]],
				},
			};
			workflowsStore.workflow.pinData = {};

			const { workflowTodos } = useBuilderTodos();

			// Since the node is disabled, the credential issue should be excluded
			expect(workflowTodos.value).toHaveLength(0);
		});

		it('excludes issues from sub-nodes when parent node is disabled', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup: AI model sub-node with credential issues
			const aiModelSubNode = createMockNode({
				name: 'OpenAI GPT-4.1-mini',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				issues: {
					credentials: {
						openAiApi: ['Credentials not set'],
					},
				},
			});

			// Parent node (AI Agent) that is disabled
			const parentNode = createMockNode({
				id: 'parent-1',
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				disabled: true,
			});

			workflowsStore.workflow.nodes = [aiModelSubNode, parentNode];

			// Sub-node outputs TO the parent node (stored by source node)
			workflowsStore.workflow.connections = {
				'OpenAI GPT-4.1-mini': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel' as const, index: 0 }]],
				},
			};
			workflowsStore.workflow.pinData = {};

			// Verify validation issue exists for the sub-node
			const validationIssues = workflowsStore.workflowValidationIssues;
			expect(validationIssues.some((i) => i.node === 'OpenAI GPT-4.1-mini')).toBe(true);

			const { workflowTodos } = useBuilderTodos();

			// Sub-node's credential issue should be excluded because parent is disabled
			expect(workflowTodos.value).toHaveLength(0);
		});

		it('includes issues from enabled nodes', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup an enabled node with placeholder in parameters
			const enabledNode = createMockNode({
				name: 'HTTP Request',
				disabled: false,
				parameters: {
					url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				},
			});

			workflowsStore.workflow.nodes = [enabledNode];
			workflowsStore.workflow.pinData = {};

			const { workflowTodos } = useBuilderTodos();

			// Since the node is enabled, the placeholder issue should be included
			expect(workflowTodos.value).toHaveLength(1);
			expect(workflowTodos.value[0].node).toBe('HTTP Request');
		});

		it('handles mixed disabled and enabled nodes correctly', () => {
			const workflowsStore = useWorkflowsStore();

			// Setup two nodes: one disabled with issues, one enabled with issues
			const disabledNode = createMockNode({
				name: 'Disabled Node',
				disabled: true,
				parameters: {
					url: '<__PLACEHOLDER_VALUE__Enter URL__>',
				},
			});

			const enabledNode = createMockNode({
				name: 'Enabled Node',
				disabled: false,
				parameters: {
					apiKey: '<__PLACEHOLDER_VALUE__Enter API Key__>',
				},
			});

			workflowsStore.workflow.nodes = [disabledNode, enabledNode];
			workflowsStore.workflow.pinData = {};

			const { workflowTodos } = useBuilderTodos();

			// Only the enabled node's issue should be included
			expect(workflowTodos.value).toHaveLength(1);
			expect(workflowTodos.value[0].node).toBe('Enabled Node');
		});

		describe('hasTodosHiddenByPinnedData', () => {
			it('returns false when there are visible todos', () => {
				const workflowsStore = useWorkflowsStore();

				// Setup a node with placeholder in parameters (no pinned data)
				const nodeWithPlaceholder = createMockNode({
					name: 'HTTP Request',
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
				});

				workflowsStore.workflow.nodes = [nodeWithPlaceholder];
				workflowsStore.workflow.pinData = {};

				const { workflowTodos, hasTodosHiddenByPinnedData } = useBuilderTodos();

				// There are visible todos, so hasTodosHiddenByPinnedData should be false
				expect(workflowTodos.value).toHaveLength(1);
				expect(hasTodosHiddenByPinnedData.value).toBe(false);
			});

			it('returns false when there are no todos and no pinned data', () => {
				const workflowsStore = useWorkflowsStore();

				// Setup a node without any issues
				const cleanNode = createMockNode({
					name: 'HTTP Request',
					parameters: {
						url: 'https://example.com',
					},
				});

				workflowsStore.workflow.nodes = [cleanNode];
				workflowsStore.workflow.pinData = {};

				const { workflowTodos, hasTodosHiddenByPinnedData } = useBuilderTodos();

				expect(workflowTodos.value).toHaveLength(0);
				expect(hasTodosHiddenByPinnedData.value).toBe(false);
			});

			it('returns true when placeholder todos are hidden by pinned data', () => {
				const workflowsStore = useWorkflowsStore();

				// Setup a node with placeholder that would show as todo
				const nodeWithPlaceholder = createMockNode({
					name: 'HTTP Request',
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
				});

				workflowsStore.workflow.nodes = [nodeWithPlaceholder];
				// Pin data hides the todo
				workflowsStore.workflow.pinData = {
					'HTTP Request': [{ json: { data: 'pinned result' } }],
				};

				const { workflowTodos, hasTodosHiddenByPinnedData } = useBuilderTodos();

				// No visible todos, but they are hidden by pinned data
				expect(workflowTodos.value).toHaveLength(0);
				expect(hasTodosHiddenByPinnedData.value).toBe(true);
			});

			it('returns true when credential todos are hidden by pinned data', () => {
				const workflowsStore = useWorkflowsStore();

				// Setup a connected node with credential issues
				const nodeWithIssues = createMockNode({
					name: 'HTTP Request',
					issues: {
						credentials: {
							httpBasicAuth: ['Credentials not set'],
						},
					},
				});

				workflowsStore.workflow.nodes = [nodeWithIssues];
				workflowsStore.workflow.connections = {
					'HTTP Request': {
						main: [[{ node: 'Other Node', type: 'main' as const, index: 0 }]],
					},
				};
				// Pin data hides the credential issue
				workflowsStore.workflow.pinData = {
					'HTTP Request': [{ json: { data: 'pinned result' } }],
				};

				const { workflowTodos, hasTodosHiddenByPinnedData } = useBuilderTodos();

				// No visible todos, but they are hidden by pinned data
				expect(workflowTodos.value).toHaveLength(0);
				expect(hasTodosHiddenByPinnedData.value).toBe(true);
			});

			it('returns false when todos are hidden by disabled nodes (not pinned)', () => {
				const workflowsStore = useWorkflowsStore();

				// Setup a disabled node with placeholder
				const disabledNode = createMockNode({
					name: 'HTTP Request',
					disabled: true,
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
				});

				workflowsStore.workflow.nodes = [disabledNode];
				workflowsStore.workflow.pinData = {};

				const { workflowTodos, hasTodosHiddenByPinnedData } = useBuilderTodos();

				// No visible todos, but they are hidden by disabled status, not pinned data
				expect(workflowTodos.value).toHaveLength(0);
				expect(hasTodosHiddenByPinnedData.value).toBe(false);
			});

			it('returns true when sub-node todos are hidden by parent pinned data', () => {
				const workflowsStore = useWorkflowsStore();

				// Setup: AI model sub-node with placeholder
				const aiModelSubNode = createMockNode({
					name: 'OpenAI GPT-4.1-mini',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					parameters: {
						prompt: '<__PLACEHOLDER_VALUE__Enter prompt__>',
					},
				});

				const parentNode = createMockNode({
					id: 'parent-1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
				});

				workflowsStore.workflow.nodes = [aiModelSubNode, parentNode];
				workflowsStore.workflow.connections = {
					'OpenAI GPT-4.1-mini': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel' as const, index: 0 }]],
					},
				};
				// Parent node has pinned data
				workflowsStore.workflow.pinData = {
					'AI Agent': [{ json: { response: 'pinned response' } }],
				};

				const { workflowTodos, hasTodosHiddenByPinnedData } = useBuilderTodos();

				// No visible todos because parent is pinned
				expect(workflowTodos.value).toHaveLength(0);
				expect(hasTodosHiddenByPinnedData.value).toBe(true);
			});

			it('returns false when node is both pinned AND disabled', () => {
				const workflowsStore = useWorkflowsStore();

				// Setup a node that is both pinned and disabled
				const pinnedDisabledNode = createMockNode({
					name: 'HTTP Request',
					disabled: true,
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
				});

				workflowsStore.workflow.nodes = [pinnedDisabledNode];
				workflowsStore.workflow.pinData = {
					'HTTP Request': [{ json: { data: 'pinned result' } }],
				};

				const { workflowTodos, hasTodosHiddenByPinnedData } = useBuilderTodos();

				// Node is disabled, so even though it has pinned data, the disabled status takes precedence
				expect(workflowTodos.value).toHaveLength(0);
				expect(hasTodosHiddenByPinnedData.value).toBe(false);
			});

			it('handles mixed scenarios: some todos visible, some hidden by pin', () => {
				const workflowsStore = useWorkflowsStore();

				// One node pinned (hiding its todo), another unpinned (showing its todo)
				const pinnedNode = createMockNode({
					name: 'Pinned Node',
					parameters: {
						url: '<__PLACEHOLDER_VALUE__Enter URL__>',
					},
				});

				const unpinnedNode = createMockNode({
					name: 'Unpinned Node',
					parameters: {
						apiKey: '<__PLACEHOLDER_VALUE__Enter API Key__>',
					},
				});

				workflowsStore.workflow.nodes = [pinnedNode, unpinnedNode];
				workflowsStore.workflow.pinData = {
					'Pinned Node': [{ json: { data: 'pinned result' } }],
				};

				const { workflowTodos, hasTodosHiddenByPinnedData } = useBuilderTodos();

				// There's still a visible todo from the unpinned node
				expect(workflowTodos.value).toHaveLength(1);
				expect(workflowTodos.value[0].node).toBe('Unpinned Node');
				// Since there are visible todos, hasTodosHiddenByPinnedData should be false
				expect(hasTodosHiddenByPinnedData.value).toBe(false);
			});
		});

		describe('reactivity for subnode todos', () => {
			it('shows subnode todos when parent node is unpinned', async () => {
				const workflowsStore = useWorkflowsStore();

				const subnodeWithPlaceholder = createMockNode({
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					parameters: {
						prompt: '<__PLACEHOLDER_VALUE__Enter prompt__>',
					},
				});

				const parentNode = createMockNode({
					id: 'parent-1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
				});

				workflowsStore.workflow.nodes = [subnodeWithPlaceholder, parentNode];
				workflowsStore.workflow.connections = {
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel' as const, index: 0 }]],
					},
				};

				// Initially parent is pinned - no todos expected
				workflowsStore.workflow.pinData = {
					'AI Agent': [{ json: { response: 'pinned' } }],
				};

				const { workflowTodos } = useBuilderTodos();
				expect(workflowTodos.value).toHaveLength(0);

				// Unpin the parent
				workflowsStore.workflow.pinData = {};

				// Should now show the subnode's placeholder todo
				expect(workflowTodos.value).toHaveLength(1);
				expect(workflowTodos.value[0].node).toBe('OpenAI Model');
			});

			it('shows subnode todos when parent node is enabled', () => {
				const workflowsStore = useWorkflowsStore();

				const subnodeWithPlaceholder = createMockNode({
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					parameters: {
						prompt: '<__PLACEHOLDER_VALUE__Enter prompt__>',
					},
				});

				const parentNode = createMockNode({
					id: 'parent-1',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					disabled: true,
				});

				workflowsStore.workflow.nodes = [subnodeWithPlaceholder, parentNode];
				workflowsStore.workflow.connections = {
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel' as const, index: 0 }]],
					},
				};
				workflowsStore.workflow.pinData = {};

				const { workflowTodos } = useBuilderTodos();

				// Initially parent is disabled - no todos expected
				expect(workflowTodos.value).toHaveLength(0);

				// Enable the parent by updating the node
				const parentIndex = workflowsStore.workflow.nodes.findIndex((n) => n.name === 'AI Agent');
				workflowsStore.workflow.nodes[parentIndex] = {
					...workflowsStore.workflow.nodes[parentIndex],
					disabled: false,
				};

				// Should now show the subnode's placeholder todo
				expect(workflowTodos.value).toHaveLength(1);
				expect(workflowTodos.value[0].node).toBe('OpenAI Model');
			});
		});
	});
});
