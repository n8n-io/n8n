import { defineConfig } from 'eslint/config';
import { nodesConfig } from '@n8n/eslint-config/nodes';
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';

// Deprecated nodes get no more fixes, so the path segment rule does not check them:
// https://docs.n8n.io/integrations/builtin/deprecated-nodes
const deprecatedNodes = [
	'./nodes/ToolExecutor/**',
	'./nodes/agents/OpenAiAssistant/**',
	'./nodes/code/**',
	'./nodes/document_loaders/DocumentBinaryInputLoader/**',
	'./nodes/document_loaders/DocumentGithubLoader/**',
	'./nodes/document_loaders/DocumentJSONInputLoader/**',
	'./nodes/llms/LMOpenAi/**',
	'./nodes/mcp/McpRegistryClientTool/**',
	'./nodes/memory/MemoryChatRetriever/**',
	'./nodes/memory/MemoryMotorhead/**',
	'./nodes/memory/MemoryZep/**',
	'./nodes/tools/ToolHttpRequest/**',
	'./nodes/tools/ToolSerpApi/**',
	'./nodes/trigger/ManualChatTrigger/**',
	'./nodes/vector_store/VectorStoreInMemoryInsert/**',
	'./nodes/vector_store/VectorStoreInMemoryLoad/**',
	'./nodes/vector_store/VectorStorePineconeInsert/**',
	'./nodes/vector_store/VectorStorePineconeLoad/**',
	'./nodes/vector_store/VectorStoreSupabaseInsert/**',
	'./nodes/vector_store/VectorStoreSupabaseLoad/**',
	'./nodes/vector_store/VectorStoreZep/**',
	'./nodes/vector_store/VectorStoreZepInsert/**',
	'./nodes/vector_store/VectorStoreZepLoad/**',
];

// Request URLs must come from requestPath or requestUrl, or be a constant string.
// These folders still send a full URL on purpose (a URL from a response, from the
// user or from the model) or hit a limit of the rule. Remove a folder from the list
// when its findings are fixed. Run `pnpm lint:request-target` to see them.
const requestTargetPending = [
	'./nodes/tools/ToolHttpRequest/**',
	'./nodes/vendors/AlibabaCloud/**',
	'./nodes/vendors/Anthropic/**',
	'./nodes/vendors/Databricks/**',
	'./nodes/vendors/GoogleGemini/**',
	'./nodes/vendors/MiniMax/**',
	'./nodes/vendors/Ollama/**',
];

export default defineConfig(
	nodesConfig,
	{
		plugins: {
			'@n8n/community-nodes': n8nCommunityNodesPlugin,
		},
		rules: {
			'@n8n/community-nodes/no-builder-hint-leakage': 'error',

			'@n8n/community-nodes/credential-documentation-url': ['error', { allowSlugs: true }],

			'@typescript-eslint/naming-convention': ['error', { selector: 'memberLike', format: null }],
			'@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],
		},
	},
	// Request path values must go through toPathSegment. The rule checks only
	// the node folders in this list. Add a node folder when its paths are encoded.
	// When all nodes are encoded, this list becomes './nodes/**/*.ts'. Then remove
	// the sentence about this list from .agents/review-rules/security/node-input-safety.md.
	// An exception needs the next-line form and a reason.
	{
		files: ['./nodes/vector_store/VectorStoreDatabricks/**/*.ts'],
		ignores: ['**/*.test.ts', '**/test/**', '**/__tests__/**', ...deprecatedNodes],
		rules: {
			'n8n-local-rules/require-encoded-path-segments': 'error',
			'n8n-local-rules/require-disable-reason': [
				'error',
				{ rules: ['n8n-local-rules/require-encoded-path-segments'] },
			],
		},
	},
	{
		files: ['./nodes/**/*.ts'],
		ignores: [
			'**/*.test.ts',
			'**/test/**',
			'**/__tests__/**',
			...deprecatedNodes,
			...requestTargetPending,
		],
		rules: {
			'n8n-local-rules/require-request-target': 'error',
		},
	},
);
