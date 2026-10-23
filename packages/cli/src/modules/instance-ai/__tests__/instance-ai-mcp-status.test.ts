import type { McpServerConfig } from '@n8n/instance-ai';
import type { Mock } from 'vitest';

import { InstanceAiService } from '../instance-ai.service';

interface McpTrackingService {
	trackMcpToolCall: (event: {
		server: McpServerConfig;
		toolName: string;
		success: boolean;
	}) => void;
	telemetry: { track: Mock };
	push: { sendToUsers: Mock };
}

describe('InstanceAiService MCP status updates', () => {
	it('notifies the connection owner only for failed registry MCP calls', () => {
		const service = Object.create(InstanceAiService.prototype) as McpTrackingService;
		service.telemetry = { track: vi.fn() };
		service.push = { sendToUsers: vi.fn() };
		const registryServer: McpServerConfig = {
			name: 'mcp_linear',
			metadata: {
				connectionId: 'connection-1',
				serverSlug: 'linear',
				userId: 'user-1',
			},
		};

		service.trackMcpToolCall({ server: registryServer, toolName: 'search', success: true });
		service.trackMcpToolCall({
			server: { name: 'static_server' },
			toolName: 'search',
			success: false,
		});
		service.trackMcpToolCall({ server: registryServer, toolName: 'search', success: false });

		expect(service.push.sendToUsers).toHaveBeenCalledOnce();
		expect(service.push.sendToUsers).toHaveBeenCalledWith(
			{
				type: 'instanceAiMcpToolCallFailed',
				data: { connectionId: 'connection-1' },
			},
			['user-1'],
		);
	});
});
