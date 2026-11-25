import type { AgentHitlOptionsQueryDto } from '@n8n/api-types';
import type { AgentsConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentChannelHitlService } from '../agent-channel-hitl.service';
import { AgentHitlChannelsController } from '../agent-hitl-channels.controller';

describe('AgentHitlChannelsController', () => {
	const req = mock<AuthenticatedRequest<{ projectId: string }>>({
		params: { projectId: 'project-1' },
	});
	const query = mock<AgentHitlOptionsQueryDto>();

	function setup(humanReviewEnabled: boolean) {
		const channels = mock<AgentChannelHitlService>();
		const config = mock<AgentsConfig>({ humanReviewEnabled });
		return { channels, controller: new AgentHitlChannelsController(channels, config) };
	}

	it('rejects both lookups when human review is disabled', async () => {
		const { channels, controller } = setup(false);

		await expect(controller.list(req, undefined, 'agent-1')).rejects.toThrow(NotFoundError);
		await expect(controller.options(req, undefined, 'agent-1', query)).rejects.toThrow(
			NotFoundError,
		);
		expect(channels.listChannels).not.toHaveBeenCalled();
		expect(channels.listOptions).not.toHaveBeenCalled();
	});

	it('runs both lookups when human review is enabled', async () => {
		const { channels, controller } = setup(true);
		channels.listChannels.mockResolvedValue([]);
		channels.listOptions.mockResolvedValue({ options: [] } as never);

		await controller.list(req, undefined, 'agent-1');
		await controller.options(req, undefined, 'agent-1', query);

		expect(channels.listChannels).toHaveBeenCalledWith(req.user, 'project-1', 'agent-1');
		expect(channels.listOptions).toHaveBeenCalledWith(req.user, 'project-1', 'agent-1', query);
	});
});
