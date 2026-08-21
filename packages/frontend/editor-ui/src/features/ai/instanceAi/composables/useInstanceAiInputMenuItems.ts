import { computed } from 'vue';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';
import { useInstanceAiComputerUseExperiment } from '@/experiments/instanceAiComputerUse';
import type { ToolConnectionStatus, ToolIconSource } from '@/features/shared/toolsConnection/types';
import {
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '../constants';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';
import { useInstanceAiMcpTelemetry } from '../instanceAiMcp.telemetry';
import { useInstanceAiComputerUseTelemetry } from '../instanceAiComputerUse.telemetry';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useBrowserUseConnection } from './useBrowserUseConnection';
import { iconForTool } from '../toolIcons';

type InputMenuItemData = {
	status?: ToolConnectionStatus;
	toolIcon?: ToolIconSource;
	action?: () => void | Promise<void>;
};

export type InputMenuItem = DropdownMenuItemProps<string, InputMenuItemData>;

export function useInstanceAiInputMenuItems(attachFiles: () => void) {
	const i18n = useI18n();
	const uiStore = useUIStore();
	const settingsStore = useInstanceAiSettingsStore();
	const mcpStore = useInstanceAiMcpStore();
	const mcpTelemetry = useInstanceAiMcpTelemetry();
	const { ensureConnected: ensureBrowserConnected } = useBrowserUseConnection();
	const computerUseTelemetry = useInstanceAiComputerUseTelemetry();
	const { isFeatureEnabled: isMcpFeatureEnabled } = useInstanceAiMcpConnectionsExperiment();
	const { isFeatureEnabled: isBrowserUseFeatureEnabled } = useInstanceAiBrowserUseExperiment();
	const { isFeatureEnabled: isComputerUseFeatureEnabled } = useInstanceAiComputerUseExperiment();

	void settingsStore.fetch();
	if (isMcpFeatureEnabled.value) void mcpStore.fetchConnectionsLazy();

	const isMcpAvailable = computed(
		() => isMcpFeatureEnabled.value && settingsStore.settings?.mcpAccessEnabled === true,
	);
	const isComputerUseAvailable = computed(
		() => isComputerUseFeatureEnabled.value && !settingsStore.isLocalGatewayDisabledByAdmin,
	);
	const isBrowserUseAvailable = computed(
		() => isBrowserUseFeatureEnabled.value && settingsStore.isBrowserUseEnabledByAdmin,
	);
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

	const disconnectedConnectionCount = computed(() => {
		let count = 0;
		if (isMcpAvailable.value) {
			count += mcpStore.connections.filter(({ status }) => status === 'disconnected').length;
		}
		if (
			isComputerUseAvailable.value &&
			settingsStore.computerUseConnectionStatus === 'disconnected'
		) {
			count++;
		}
		if (
			isBrowserUseAvailable.value &&
			settingsStore.browserUseConnectionStatus === 'disconnected'
		) {
			count++;
		}
		return count;
	});

	const menuItems = computed(() => {
		const items: InputMenuItem[] = [
			{
				id: 'attach-files',
				label: i18n.baseText('chatInputBase.button.attach'),
				icon: { type: 'icon', value: 'paperclip' },
				data: { action: attachFiles },
			},
		];

		if (isMcpAvailable.value) {
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
			const toolsChildren: InputMenuItem[] | undefined =
				tools.length > 0
					? [
							...tools,
							{
								id: 'add-tool',
								label: i18n.baseText('instanceAi.inputMenu.tools.add'),
								icon: { type: 'icon', value: 'plus' },
								divided: true,
								data: { action: openToolsModal },
							},
						]
					: undefined;

			items.push({
				id: 'tools',
				label: i18n.baseText(
					tools.length > 0
						? 'instanceAi.inputMenu.tools.connected'
						: 'instanceAi.inputMenu.tools.connect',
				),
				icon: { type: 'icon', value: 'plug' },
				data: tools.length > 0 ? { status: toolsStatus } : { action: openToolsModal },
				children: toolsChildren,
			});
		}

		if (isComputerUseAvailable.value) {
			items.push(
				createConnectionItem({
					id: 'computer',
					status: settingsStore.computerUseConnectionStatus,
					icon: 'laptop',
					connectLabel: i18n.baseText('instanceAi.inputMenu.computer.connect'),
					connectedLabel: i18n.baseText('instanceAi.inputMenu.computer.connected'),
					connectedTitle: settingsStore.gatewayHostIdentifier ?? undefined,
					connect: openComputerSetup,
					disconnect: settingsStore.disconnectComputerUse,
				}),
			);
		}

		if (isBrowserUseAvailable.value) {
			items.push(
				createConnectionItem({
					id: 'browser',
					status: settingsStore.browserUseConnectionStatus,
					icon: 'globe',
					connectLabel: i18n.baseText('instanceAi.inputMenu.browser.connect'),
					connectedLabel: i18n.baseText('instanceAi.inputMenu.browser.connected'),
					connectedTitle:
						settingsStore.browserUseConnectionStatus !== 'none'
							? i18n.baseText('instanceAi.inputMenu.browser.connectedTitle')
							: undefined,
					// An instance the user allowed reconnects with no modal at all, so the flow
					// decides whether one is needed — and reports the open when it is.
					connect: async () => {
						await ensureBrowserConnected('input_menu');
					},
					disconnect: settingsStore.disconnectBrowserUse,
				}),
			);
		}

		return items;
	});

	return { menuItems, disconnectedConnectionCount };
}
