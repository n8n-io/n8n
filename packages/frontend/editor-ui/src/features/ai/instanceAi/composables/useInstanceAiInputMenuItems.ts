import { computed } from 'vue';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';
import { useInstanceAiComputerUseExperiment } from '@/experiments/instanceAiComputerUse';
import type { ToolConnectionStatus, ToolIconSource } from '@/features/shared/toolsConnection/types';
import {
	BROWSER_USE_CONNECTION_TYPE,
	COMPUTER_USE_CONNECTION_TYPE,
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '../constants';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';
import { useInstanceAiMcpTelemetry } from '../instanceAiMcp.telemetry';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { iconForTool } from '../toolIcons';

type InputMenuItemData = {
	status?: ToolConnectionStatus;
	toolIcon?: ToolIconSource;
	action?: () => void | Promise<void>;
};

export type InputMenuItem = Omit<DropdownMenuItemProps<string, InputMenuItemData>, 'children'> & {
	children?: InputMenuItem[];
};

export function useInstanceAiInputMenuItems(attachFiles: () => void) {
	const i18n = useI18n();
	const uiStore = useUIStore();
	const settingsStore = useInstanceAiSettingsStore();
	const mcpStore = useInstanceAiMcpStore();
	const mcpTelemetry = useInstanceAiMcpTelemetry();
	const { isFeatureEnabled: isMcpFeatureEnabled } = useInstanceAiMcpConnectionsExperiment();
	const { isFeatureEnabled: isBrowserUseFeatureEnabled } = useInstanceAiBrowserUseExperiment();
	const { isFeatureEnabled: isComputerUseFeatureEnabled } = useInstanceAiComputerUseExperiment();

	void settingsStore.fetch();
	if (isMcpFeatureEnabled.value) void mcpStore.fetchConnectionsLazy();

	async function openComputerSetup() {
		if (settingsStore.isLocalGatewayDisabled) {
			await settingsStore.persistLocalGatewayPreference(false);
		}
		uiStore.openModal(INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY);
	}

	function openToolsModal() {
		mcpTelemetry.trackToolsListOpened();
		uiStore.openModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
	}

	function createConnectionItem({
		id,
		status,
		icon,
		connectLabel,
		connectedLabel,
		connectedTitle,
		connect,
		disconnect,
	}: {
		id: string;
		status: ToolConnectionStatus;
		icon: IconName;
		connectLabel: string;
		connectedLabel: string;
		connectedTitle?: string;
		connect: () => void | Promise<void>;
		disconnect: () => void | Promise<void>;
	}): InputMenuItem {
		const menuStatus = status === 'disconnected' ? 'none' : status;

		if (menuStatus !== 'connected') {
			return {
				id,
				label: connectLabel,
				icon: { type: 'icon', value: icon },
				data: { status: menuStatus, action: connect },
			};
		}

		return {
			id,
			label: connectedLabel,
			icon: { type: 'icon', value: icon },
			data: { status },
			children: [
				{
					id: `${id}-status`,
					label: connectedTitle ?? i18n.baseText('instanceAi.connections.row.status.connected'),
					header: true,
				},
				{
					id: `${id}-disconnect`,
					label: i18n.baseText('instanceAi.connections.row.disconnect'),
					data: { action: disconnect },
				},
			],
		};
	}

	return computed(() => {
		const items: InputMenuItem[] = [
			{
				id: 'attach-files',
				label: i18n.baseText('chatInputBase.button.attach'),
				icon: { type: 'icon', value: 'paperclip' },
				data: { action: attachFiles },
			},
		];

		if (isMcpFeatureEnabled.value && settingsStore.settings?.mcpAccessEnabled === true) {
			const tools: InputMenuItem[] = mcpStore.connections.map((connection) => ({
				id: `mcp-${connection.id}`,
				label: connection.serverTitle,
				data: {
					status: connection.status,
					toolIcon: iconForTool(connection.serverIcons, uiStore.appliedTheme),
				},
				children: [
					{
						id: `mcp-${connection.id}-credential`,
						label: connection.credentialName,
						header: true,
					},
					{
						id: `mcp-${connection.id}-setup`,
						label: i18n.baseText('instanceAi.connections.row.settings'),
						data: {
							action: () => {
								mcpTelemetry.trackSettingsOpened(connection.serverSlug);
								uiStore.openModalWithData({
									name: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
									data: { connectionId: connection.id },
								});
							},
						},
					},
					{
						id: `mcp-${connection.id}-disconnect`,
						label: i18n.baseText(
							connection.status === 'disconnected'
								? 'instanceAi.connections.row.remove'
								: 'instanceAi.connections.row.disconnect',
						),
						divided: true,
						data: {
							action: async () => {
								await mcpStore.disconnect(connection.id);
							},
						},
					},
				],
			}));

			const toolsStatus: ToolConnectionStatus = tools.some(
				({ data }) => data?.status === 'connecting',
			)
				? 'connecting'
				: tools.some(({ data }) => data?.status === 'disconnected')
					? 'disconnected'
					: tools.length > 0
						? 'connected'
						: 'none';

			items.push({
				id: 'tools',
				label: i18n.baseText(
					tools.length > 0
						? 'instanceAi.inputMenu.tools.connected'
						: 'instanceAi.inputMenu.tools.connect',
				),
				icon: { type: 'icon', value: 'plug' },
				data: toolsStatus === 'none' ? undefined : { status: toolsStatus },
				children: [
					...tools,
					{
						id: 'add-tool',
						label: i18n.baseText('instanceAi.inputMenu.tools.add'),
						icon: { type: 'icon', value: 'plus' },
						divided: tools.length > 0,
						data: { action: openToolsModal },
					},
				],
			});
		}

		if (isComputerUseFeatureEnabled.value && !settingsStore.isLocalGatewayDisabledByAdmin) {
			const connection = settingsStore.connections.find(
				({ type }) => type === COMPUTER_USE_CONNECTION_TYPE,
			);
			items.push(
				createConnectionItem({
					id: 'computer',
					status: connection?.status ?? 'none',
					icon: 'laptop',
					connectLabel: i18n.baseText('instanceAi.inputMenu.computer.connect'),
					connectedLabel: i18n.baseText('instanceAi.connections.types.computerUse.subtitle'),
					connectedTitle: settingsStore.gatewayHostIdentifier ?? undefined,
					connect: openComputerSetup,
					disconnect: settingsStore.disconnectComputerUse,
				}),
			);
		}

		if (isBrowserUseFeatureEnabled.value && settingsStore.isBrowserUseEnabledByAdmin) {
			const connection = settingsStore.connections.find(
				({ type }) => type === BROWSER_USE_CONNECTION_TYPE,
			);
			items.push(
				createConnectionItem({
					id: 'browser',
					status: connection?.status ?? 'none',
					icon: 'globe',
					connectLabel: i18n.baseText('instanceAi.inputMenu.browser.connect'),
					connectedLabel: i18n.baseText('instanceAi.connections.types.browserUse.subtitle'),
					connectedTitle: connection?.name,
					connect: () => uiStore.openModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY),
					disconnect: settingsStore.disconnectBrowserUse,
				}),
			);
		}

		return items;
	});
}
