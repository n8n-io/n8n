import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useRouter } from 'vue-router';
import type { SkillListItem } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useAssistantSkillsExperiment } from '@/experiments/assistantSkills/useAssistantSkillsExperiment';
import { isContextSkillsEnabled } from '@/features/settings/context/context.utils';
import { getSkills } from '@/features/settings/context/skills.api';
import { iconForMcpRegistryServer } from '@/features/shared/toolsConnection/mcpRegistryIcon';
import type { NodeIconSource, ToolConnectionStatus } from '@/features/shared/toolsConnection/types';
import { INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY } from '../constants';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';
import { useInstanceAiMcpTelemetry } from '../instanceAiMcp.telemetry';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useBrowserUseConnection } from './useBrowserUseConnection';
import { useMcpServerConnect } from './useMcpServerConnect';

type InputMenuItemData = {
	status?: ToolConnectionStatus;
	toolIcon?: NodeIconSource;
	action?: () => void | Promise<void>;
};

export type InputMenuItem = DropdownMenuItemProps<string, InputMenuItemData>;

export function useInstanceAiInputMenuItems(
	attachFiles: () => void,
	projectId?: MaybeRefOrGetter<string | undefined>,
) {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const router = useRouter();
	const settingsStore = useInstanceAiSettingsStore();
	const mcpStore = useInstanceAiMcpStore();
	const { ignorePendingConnectResult } = useMcpServerConnect();
	const mcpTelemetry = useInstanceAiMcpTelemetry();
	const { ensureConnected: ensureBrowserConnected } = useBrowserUseConnection();
	const { isEnabled: assistantSkillsEnabled } = useAssistantSkillsExperiment();
	const shouldShowSkills = computed(() => assistantSkillsEnabled.value && isContextSkillsEnabled());
	const skills = ref<SkillListItem[]>([]);
	const skillsLoadState = ref<'loading' | 'loaded' | 'error'>('loading');
	const { next: nextSkillsLoad } = useLatestFetch();

	async function refreshSkills() {
		const isLatest = nextSkillsLoad();
		if (!shouldShowSkills.value) return;
		skills.value = [];
		skillsLoadState.value = 'loading';
		try {
			// Without `take`, the API returns every visible skill.
			const result = await getSkills(rootStore.restApiContext);
			if (!isLatest()) return;
			skills.value = result.data;
			skillsLoadState.value = 'loaded';
		} catch {
			if (isLatest()) skillsLoadState.value = 'error';
		}
	}

	void settingsStore.fetch();
	watch(
		() => settingsStore.isMcpAvailable,
		(isAvailable) => {
			if (isAvailable) void mcpStore.fetchConnectionsLazy();
		},
		{ immediate: true },
	);

	// The store owns this, so the + menu and the message payload cannot disagree.
	const isBrowserUseAvailable = computed(() => settingsStore.isBrowserUseAvailable);

	function openToolsModal() {
		mcpTelemetry.trackToolsListOpened('input_menu');
		uiStore.openModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
	}

	function openPreferenceSettings() {
		// A new tab keeps the chat and its unsent draft.
		window.open(router.resolve({ name: VIEWS.SETTINGS_CONTEXT_PREFERENCES }).href, '_blank');
	}

	function openSkillSettings(query: { skillId?: string; create?: string } = {}) {
		window.open(router.resolve({ name: VIEWS.SETTINGS_CONTEXT_SKILLS, query }).href, '_blank');
	}

	const skillMenuItems = computed<InputMenuItem[]>(() => {
		const children: InputMenuItem[] = [];
		const availableSkills = skills.value
			.filter(
				(skill) =>
					skill.availableToAssistant &&
					skill.name.trim() &&
					skill.description.trim() &&
					(skill.scope === 'instance' ||
						(skill.scope === 'project' && skill.projectId === toValue(projectId))),
			)
			.sort((left, right) => left.name.localeCompare(right.name));

		if (skillsLoadState.value !== 'loaded' || availableSkills.length === 0) {
			children.push({
				id: 'skills-status',
				label: i18n.baseText(
					skillsLoadState.value === 'loading'
						? 'instanceAi.inputMenu.skills.loading'
						: skillsLoadState.value === 'error'
							? 'instanceAi.inputMenu.skills.loadError'
							: 'instanceAi.inputMenu.skills.empty',
				),
				disabled: true,
			});
		} else {
			for (const scope of ['project', 'instance'] as const) {
				const group = availableSkills.filter((skill) => skill.scope === scope);
				if (group.length === 0) continue;
				children.push(
					{
						id: `skills-${scope}`,
						label: i18n.baseText(`settings.context.skills.scope.${scope}`),
						header: true,
						divided: children.length > 0,
					},
					...group.map((skill) => ({
						id: `skill-${skill.id}`,
						label: skill.name,
						data: { action: () => openSkillSettings({ skillId: skill.id }) },
					})),
				);
			}
		}

		children.push(
			{
				id: 'manage-skills',
				label: i18n.baseText('instanceAi.inputMenu.skills.manage'),
				divided: true,
				data: { action: () => openSkillSettings() },
			},
			{
				id: 'create-skill',
				label: i18n.baseText('instanceAi.inputMenu.skills.create'),
				icon: { type: 'icon', value: 'plus' },
				data: { action: () => openSkillSettings({ create: 'true' }) },
			},
		);
		return children;
	});

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
		if (settingsStore.isMcpAvailable) {
			count += mcpStore.connections.filter(({ status }) => status === 'disconnected').length;
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

		if (settingsStore.isMcpAvailable) {
			const tools: InputMenuItem[] = mcpStore.connections.map((connection) => ({
				id: `mcp-${connection.id}`,
				label: connection.serverTitle,
				data: {
					status: connection.status,
					toolIcon: iconForMcpRegistryServer(connection.serverIcons, uiStore.appliedTheme),
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

		if (shouldShowSkills.value) {
			items.push({
				id: 'skills',
				label: i18n.baseText('instanceAi.inputMenu.skills.label'),
				icon: { type: 'icon', value: 'book-open' },
				children: skillMenuItems.value,
			});
		}

		items.push({
			id: 'preferences',
			label: i18n.baseText('instanceAi.inputMenu.preferences.label'),
			icon: { type: 'icon', value: 'brain' },
			divided: true,
			data: { action: openPreferenceSettings },
		});

		return items;
	});

	return { menuItems, disconnectedConnectionCount, refreshSkills };
}
