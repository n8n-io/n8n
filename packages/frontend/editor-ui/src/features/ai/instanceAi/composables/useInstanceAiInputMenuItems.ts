import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useRouter } from 'vue-router';
import type { AiPreferencesAppliedPayload } from '@n8n/api-types';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import { useContextStore } from '@/features/settings/context/context.store';
import { isContextPreferencesEnabled } from '@/features/settings/context/context.utils';
import type { ToolConnectionStatus, ToolIconSource } from '@/features/shared/toolsConnection/types';
import {
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';
import { useInstanceAiMcpTelemetry } from '../instanceAiMcp.telemetry';
import { useInstanceAiComputerUseTelemetry } from '../instanceAiComputerUse.telemetry';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useBrowserUseConnection } from './useBrowserUseConnection';
import { useMcpServerConnect } from './useMcpServerConnect';
import { iconForTool } from '../toolIcons';

type InputMenuItemData = {
	status?: ToolConnectionStatus;
	toolIcon?: ToolIconSource;
	action?: () => void | Promise<void>;
	/** A preference row the turn applied; `removed` when the row no longer resolves. */
	preference?: 'applied' | 'removed';
};

export type InputMenuItem = DropdownMenuItemProps<string, InputMenuItemData>;

type AppliedPreference = AiPreferencesAppliedPayload['preferences'][number];

export function useInstanceAiInputMenuItems(
	attachFiles: () => void,
	/** The thread whose applied preferences the menu reports. None before a thread exists. */
	threadId: MaybeRefOrGetter<string | undefined> = undefined,
) {
	const i18n = useI18n();
	const router = useRouter();
	const uiStore = useUIStore();
	const settingsStore = useInstanceAiSettingsStore();
	const mcpStore = useInstanceAiMcpStore();
	const instanceAiStore = useInstanceAiStore();
	const contextStore = useContextStore();
	const { ignorePendingConnectResult } = useMcpServerConnect();
	const mcpTelemetry = useInstanceAiMcpTelemetry();
	const { ensureConnected: ensureBrowserConnected } = useBrowserUseConnection();
	const computerUseTelemetry = useInstanceAiComputerUseTelemetry();
	const { isFeatureEnabled: isMcpFeatureEnabled } = useInstanceAiMcpConnectionsExperiment();

	void settingsStore.fetch();
	if (isMcpFeatureEnabled.value) void mcpStore.fetchConnectionsLazy();

	const isMcpAvailable = computed(
		() => isMcpFeatureEnabled.value && settingsStore.settings?.mcpAccessEnabled === true,
	);
	// The store owns this, so the + menu and the message payload cannot disagree.
	const isComputerUseAvailable = computed(() => settingsStore.isComputerUseAvailable);
	const isBrowserUseAvailable = computed(() => settingsStore.isBrowserUseAvailable);
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

	// --- Applied preferences ---
	//
	// The list comes from the `preferences-applied` payload the backend published for
	// the thread's latest turn, never from a fresh read of the settings list: the two
	// answer different questions (a bound project against every project, a failed read,
	// a flag that is off), and a menu that disagrees with what the assistant received
	// is worse than no menu. Only the display text is looked up, by id.
	const isPreferencesAvailable = computed(() => isContextPreferencesEnabled());
	const appliedPreferences = computed<AiPreferencesAppliedPayload | null>(() => {
		const id = toValue(threadId);
		if (!id) return null;
		return instanceAiStore.getRuntime(id)?.appliedPreferences ?? null;
	});
	const appliedPreferenceIds = computed(() =>
		(appliedPreferences.value?.preferences ?? []).map(({ id }) => id),
	);
	const preferenceTextById = ref(new Map<string, string>());
	const isLoadingPreferenceTexts = ref(false);
	let latestTextsRead = 0;

	/** Resolves the text behind each applied id. Safe to call again: the newest read wins. */
	async function refreshAppliedPreferences() {
		const ids = appliedPreferenceIds.value;
		if (!isPreferencesAvailable.value || ids.length === 0) {
			preferenceTextById.value = new Map();
			return;
		}
		const read = ++latestTextsRead;
		isLoadingPreferenceTexts.value = true;
		try {
			const rows = await contextStore.fetchPreferencesByIds(ids);
			if (read !== latestTextsRead) return;
			preferenceTextById.value = new Map(rows.map((row) => [row.id, row.content]));
		} catch {
			// The ids still render, as removed rows. A failed lookup must not hide the list.
			if (read === latestTextsRead) preferenceTextById.value = new Map();
		} finally {
			if (read === latestTextsRead) isLoadingPreferenceTexts.value = false;
		}
	}

	watch(
		appliedPreferenceIds,
		(ids, previous) => {
			if (previous && ids.join('\n') === previous.join('\n')) return;
			void refreshAppliedPreferences();
		},
		{ immediate: true },
	);

	function preferenceGroupKey(preference: AppliedPreference): string {
		return preference.scope === 'project'
			? `project-${preference.projectId ?? ''}`
			: preference.scope;
	}

	function preferenceGroupLabel(preference: AppliedPreference): string {
		switch (preference.scope) {
			case 'instance':
				return i18n.baseText('instanceAi.inputMenu.preferences.scope.instance');
			case 'user':
				return i18n.baseText('instanceAi.inputMenu.preferences.scope.user');
			case 'project':
				return (
					preference.projectName ?? i18n.baseText('instanceAi.inputMenu.preferences.scope.project')
				);
		}
	}

	/** Group headers follow the payload order, so the menu lists what the prompt carried, as it carried it. */
	function preferenceItems(): InputMenuItem[] {
		const preferences = appliedPreferences.value?.preferences ?? [];
		if (preferences.length === 0) {
			return [
				{
					id: 'preferences-empty',
					label: i18n.baseText('instanceAi.inputMenu.preferences.empty'),
					disabled: true,
				},
			];
		}

		const items: InputMenuItem[] = [];
		let currentGroup: string | undefined;
		for (const preference of preferences) {
			const group = preferenceGroupKey(preference);
			if (group !== currentGroup) {
				currentGroup = group;
				items.push({
					id: `preferences-group-${group}`,
					label: preferenceGroupLabel(preference),
					header: true,
				});
			}
			const text = preferenceTextById.value.get(preference.id);
			items.push({
				id: `preference-${preference.id}`,
				label: text ?? i18n.baseText('instanceAi.inputMenu.preferences.removed'),
				keepOpen: true,
				data: { preference: text === undefined ? 'removed' : 'applied' },
			});
		}
		return items;
	}

	function openPreferenceSettings() {
		void router.push({ name: VIEWS.SETTINGS_CONTEXT_PREFERENCES });
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
								ignorePendingConnectResult(connection.serverSlug);
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

		if (isPreferencesAvailable.value) {
			// An empty payload still gets the item: "none applied" is information.
			items.push({
				id: 'preferences',
				label: i18n.baseText('instanceAi.inputMenu.preferences.label'),
				icon: { type: 'icon', value: 'brain' },
				loading: isLoadingPreferenceTexts.value,
				children: [
					...preferenceItems(),
					{
						id: 'preferences-manage',
						label: i18n.baseText('instanceAi.inputMenu.preferences.manage'),
						icon: { type: 'icon', value: 'settings' },
						divided: true,
						data: { action: openPreferenceSettings },
					},
				],
			});
		}

		return items;
	});

	return { menuItems, disconnectedConnectionCount, refreshAppliedPreferences };
}
