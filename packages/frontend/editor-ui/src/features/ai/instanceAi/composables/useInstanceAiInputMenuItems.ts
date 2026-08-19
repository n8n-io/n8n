import { computed } from 'vue';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';
import { useInstanceAiComputerUseExperiment } from '@/experiments/instanceAiComputerUse';
import type { ToolConnectionStatus, ToolIconSource } from '@/features/shared/toolsConnection/types';
import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '../constants';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';
import { useInstanceAiMcpTelemetry } from '../instanceAiMcp.telemetry';
import { useInstanceAiBrowserUseTelemetry } from '../instanceAiBrowserUse.telemetry';
import { useInstanceAiComputerUseTelemetry } from '../instanceAiComputerUse.telemetry';
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
	const browserUseTelemetry = useInstanceAiBrowserUseTelemetry();
	const computerUseTelemetry = useInstanceAiComputerUseTelemetry();
	const { isFeatureEnabled: isMcpFeatureEnabled } = useInstanceAiMcpConnectionsExperiment();
	const { isFeatureEnabled: isBrowserUseFeatureEnabled } = useInstanceAiBrowserUseExperiment();
	const { isFeatureEnabled: isComputerUseFeatureEnabled } = useInstanceAiComputerUseExperiment();

	void settingsStore.fetch();
	if (isMcpFeatureEnabled.value) void mcpStore.fetchConnectionsLazy();

	async function openComputerSetup() {
		if (settingsStore.isLocalGatewayDisabled) {
			await settingsStore.persistLocalGatewayPreference(false);
		}

		computerUseTelemetry.trackModalOpened(settingsStore.isGatewayConnected, 'input_menu');
		uiStore.openModal(INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY);
	}

	function openToolsModal() {
		mcpTelemetry.trackToolsListOpened('input_menu');
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
		if (status === 'none' || status === 'connecting') {
			return {
				id,
				label: connectLabel,
				icon: { type: 'icon', value: icon },
				data: { status, action: connect },
			};
		}

		if (status === 'disconnected') {
			return {
				id,
				label: connectedLabel,
				icon: { type: 'icon', value: icon },
				data: { status },
				children: [
					...(connectedTitle ? [{ id: `${id}-status`, label: connectedTitle, header: true }] : []),
					{
						id: `${id}-reconnect`,
						label: i18n.baseText('tools.connection.action.reconnect'),
						data: { action: connect },
					},
				],
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
					label: connectedTitle ?? i18n.baseText('instanceAi.inputMenu.status.connected'),
					header: true,
				},
				{
					id: `${id}-disconnect`,
					label: i18n.baseText('instanceAi.inputMenu.actions.disconnect'),
					data: { action: disconnect },
				},
			],
		};
	}

	const hasDisconnectedConnection = computed(
		() =>
			(isMcpFeatureEnabled.value &&
				settingsStore.settings?.mcpAccessEnabled === true &&
				mcpStore.connections.some(({ status }) => status === 'disconnected')) ||
			(isComputerUseFeatureEnabled.value &&
				!settingsStore.isLocalGatewayDisabledByAdmin &&
				settingsStore.hasUnexpectedGatewayDisconnect) ||
			(isBrowserUseFeatureEnabled.value &&
				settingsStore.isBrowserUseEnabledByAdmin &&
				settingsStore.hasUnexpectedBrowserDisconnect),
	);

	const menuItems = computed(() => {
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
						label: i18n.baseText('instanceAi.inputMenu.actions.settings'),
						data: {
							action: () => {
								mcpTelemetry.trackSettingsOpened(connection.serverSlug, 'input_menu');
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
								? 'instanceAi.inputMenu.actions.remove'
								: 'instanceAi.inputMenu.actions.disconnect',
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
			items.push(
				createConnectionItem({
					id: 'computer',
					status: settingsStore.isGatewayConnected
						? 'connected'
						: settingsStore.isDaemonConnecting
							? 'connecting'
							: settingsStore.hasUnexpectedGatewayDisconnect
								? 'disconnected'
								: 'none',
					icon: 'laptop',
					connectLabel: i18n.baseText('instanceAi.inputMenu.computer.connect'),
					connectedLabel: i18n.baseText('instanceAi.inputMenu.computer.connected'),
					connectedTitle: settingsStore.gatewayHostIdentifier ?? undefined,
					connect: openComputerSetup,
					disconnect: settingsStore.disconnectComputerUse,
				}),
			);
		}

		if (isBrowserUseFeatureEnabled.value && settingsStore.isBrowserUseEnabledByAdmin) {
			items.push(
				createConnectionItem({
					id: 'browser',
					status: settingsStore.browserConnected
						? 'connected'
						: settingsStore.hasUnexpectedBrowserDisconnect
							? 'disconnected'
							: 'none',
					icon: 'globe',
					connectLabel: i18n.baseText('instanceAi.inputMenu.browser.connect'),
					connectedLabel: i18n.baseText('instanceAi.inputMenu.browser.connected'),
					connectedTitle:
						settingsStore.browserConnected || settingsStore.hasUnexpectedBrowserDisconnect
							? 'Google Chrome'
							: undefined,
					connect: () => {
						browserUseTelemetry.trackModalOpened('input_menu');
						uiStore.openModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
					},
					disconnect: settingsStore.disconnectBrowserUse,
				}),
			);
		}

		return items;
	});

	return { menuItems, hasDisconnectedConnection };
}
