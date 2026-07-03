import path from 'node:path';
import { mergeConfig } from 'vite';
import { createVitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(createVitestConfig({}), {
	resolve: {
		alias: [
			// @inquirer/prompts and its sub-packages are ESM-only. Tests redirect
			// any @inquirer/* import to this mock (mirrors the former Jest
			// moduleNameMapper).
			{
				find: /^@inquirer\/.*$/,
				replacement: path.resolve(__dirname, './src/__mocks__/@inquirer/prompts.ts'),
			},
		],
	},
});
