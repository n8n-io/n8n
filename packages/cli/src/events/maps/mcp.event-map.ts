import type { IRun } from 'n8n-workflow';

export type McpEventMap = {
	'mcp-worker-response': {
		executionId: string;
		runData: IRun;
	};
};
