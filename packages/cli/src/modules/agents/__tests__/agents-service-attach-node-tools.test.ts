import type { CredentialProvider, BuiltTool } from '@n8n/agents';
import type * as agents from '@n8n/agents';
import { mock } from 'jest-mock-extended';

import type { AgentsToolsService } from '../agents-tools.service';

// Pure unit test of the small attach helper extracted in Step 3.
import { attachNodeToolsIfEnabled } from '../agents.service';

describe('attachNodeToolsIfEnabled', () => {
	function setup() {
		const agent = mock<agents.Agent>();
		const agentsToolsService = mock<AgentsToolsService>();
		agentsToolsService.getRuntimeTools.mockReturnValue([] as BuiltTool[]);
		const credentialProvider = mock<CredentialProvider>();
		return { agent, agentsToolsService, credentialProvider };
	}

	it('attaches the runtime tools when enabled is true', () => {
		const { agent, agentsToolsService, credentialProvider } = setup();

		attachNodeToolsIfEnabled(agent, agentsToolsService, 'project-1', credentialProvider, true);

		expect(agentsToolsService.getRuntimeTools).toHaveBeenCalledWith(
			credentialProvider,
			'project-1',
		);
		expect(agent.tool).toHaveBeenCalled();
	});

	it('is a no-op when enabled is false', () => {
		const { agent, agentsToolsService, credentialProvider } = setup();

		attachNodeToolsIfEnabled(agent, agentsToolsService, 'project-1', credentialProvider, false);

		expect(agentsToolsService.getRuntimeTools).not.toHaveBeenCalled();
		expect(agent.tool).not.toHaveBeenCalled();
	});
});
