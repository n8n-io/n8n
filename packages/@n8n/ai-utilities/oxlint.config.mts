import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['scripts/**'],
	overrides: [
		{
			files: ['src/utils/n8n-binary-loader.ts'],
			rules: { 'no-case-declarations': 'warn' },
		},
		{
			files: [
				'src/__tests__/adapters/langchain-chat-model.test.ts',
				'src/__tests__/suppliers/supplyModel.test.ts',
				'src/__tests__/utils/failed-attempt-handler/n8nLlmFailedAttemptHandler.test.ts',
				'src/__tests__/utils/n8n-llm-tracing.test.ts',
				'src/adapters/langchain-chat-model.ts',
				'src/types/message.ts',
				'src/types/tool.ts',
				'src/utils/failed-attempt-handler/n8nLlmFailedAttemptHandler.ts',
				'src/utils/log-wrapper.ts',
				'src/utils/vector-store/createVectorStoreNode/operations/__tests__/*.test.ts',
			],
			rules: { 'typescript/no-explicit-any': 'warn' },
		},
		{
			files: [
				'src/__tests__/suppliers/supplyModel.test.ts',
				'src/__tests__/utils/failed-attempt-handler/n8n*.test.ts',
				'src/suppliers/supplyMemory.ts',
				'src/suppliers/supplyModel.ts',
				'src/utils/failed-attempt-handler/n8n*.ts',
				'src/utils/vector-store/MemoryManager/**',
				'src/utils/vector-store/createVectorStoreNode/**',
				'src/utils/vector-store/processDocuments.ts',
			],
			rules: { 'unicorn/filename-case': 'off' },
		},
	],
});
