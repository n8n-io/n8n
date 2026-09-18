import { defineConfig } from 'oxlint';

export const backendNetworkBoundaryConfig = defineConfig({
	rules: {
		'n8n-local-rules/no-uncentralized-http': [
			'error',
			{
				allow: ['packages/@n8n/backend-network/', 'packages/@n8n/benchmark/'],
			},
		],
	},
});
