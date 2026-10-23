// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { McpDiscoveryModule } from '../mcp-discovery.module';
import { McpDiscoveryActivityEvents } from '../activity-events.service';

vi.mock('../mcp-discovery.controller', () => ({}));

const config = mock<GlobalConfig>({ deployment: { type: 'cloud' } });
const activityEvents = mock<McpDiscoveryActivityEvents>();

beforeEach(() => {
	vi.clearAllMocks();
	Container.set(GlobalConfig, config);
	Container.set(McpDiscoveryActivityEvents, activityEvents);
});

afterEach(() => Container.reset());

it('starts activity collection on Cloud without waiting for a visit', async () => {
	config.deployment.type = 'cloud';
	await new McpDiscoveryModule().init();
	expect(activityEvents.init).toHaveBeenCalledOnce();
});

it('does not start activity collection on self-hosted instances', async () => {
	config.deployment.type = 'default';
	await new McpDiscoveryModule().init();
	expect(activityEvents.init).not.toHaveBeenCalled();
});
// EOF Experiment cleanup
