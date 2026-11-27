import { CUSTOM_MCP_SERVERS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

/** Whether the flag gives this instance the variant `test`. Reads reactive state. */
export const customMcpServersEnabled = () =>
	usePostHog().getVariant(CUSTOM_MCP_SERVERS_EXPERIMENT.name) ===
	CUSTOM_MCP_SERVERS_EXPERIMENT.test;
