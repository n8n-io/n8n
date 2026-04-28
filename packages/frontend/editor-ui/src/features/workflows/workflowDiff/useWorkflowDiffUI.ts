import type { IWorkflowDb, INodeUi } from '@/Interface';
import type { IWorkflowSettings } from 'n8n-workflow';
import { NodeDiffStatus } from 'n8n-workflow';
import { computed, ref, type Ref, type ComputedRef } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n } from '@n8n/i18n';
import { STICKY_NODE_TYPE } from '@/app/constants';

export type SettingsChange = {
	name: string;
	before: string;
	after: string;
};

export interface UseWorkflowDiffUIOptions {
	sourceWorkflow: ComputedRef<IWorkflowDb | undefined>;
	targetWorkflow: ComputedRef<IWorkflowDb | undefined>;
	nodesDiff: Ref<Map<string, { status: NodeDiffStatus; node: INodeUi }>>;
	connectionsDiff: Ref<Map<string, { status: NodeDiffStatus; connection: unknown }>>;
	selectedDetailId: Ref<string | undefined>;
	onNavigate?: (context: 'next' | 'previous') => void;
	onTabChange?: (tab: 'nodes' | 'connectors' | 'settings') => void;
}

export function useWorkflowDiffUI(options: UseWorkflowDiffUIOptions) {
	const {
		sourceWorkflow,
		targetWorkflow,
		nodesDiff,
		connectionsDiff,
		selectedDetailId,
		onNavigate,
		onTabChange,
	} = options;

	const nodeTypesStore = useNodeTypesStore();
	const i18n = useI18n();

	// Settings diff calculation
	const settingsDiff = computed<SettingsChange[]>(() => {
		const sourceSettings: IWorkflowSettings = sourceWorkflow.value?.settings ?? {};
		const targetSettings: IWorkflowSettings = targetWorkflow.value?.settings ?? {};

		const allKeys = new Set<keyof IWorkflowSettings>(
			[...Object.keys(sourceSettings), ...Object.keys(targetSettings)].filter(
				(key): key is keyof IWorkflowSettings => key in sourceSettings || key in targetSettings,
			),
		);

		const settings = Array.from(allKeys).reduce<SettingsChange[]>((acc, key) => {
			const val1 = sourceSettings[key];
			const val2 = targetSettings[key];

			if (val1 !== val2) {
				acc.push({
					name: key,
					before: String(val1),
					after: String(val2),
				});
			}
			return acc;
		}, []);

		const sourceName = sourceWorkflow.value?.name;
		const targetName = targetWorkflow.value?.name;

		if (sourceName && targetName && sourceName !== targetName) {
			settings.unshift({
				name: 'name',
				before: sourceName,
				after: targetName,
			});
		}

		const sourceTags = (sourceWorkflow.value?.tags ?? []).map((tag) =>
			typeof tag === 'string' ? tag : tag.name,
		);
		const targetTags = (targetWorkflow.value?.tags ?? []).map((tag) =>
			typeof tag === 'string' ? tag : tag.name,
		);

		if (JSON.stringify(sourceTags) !== JSON.stringify(targetTags)) {
			settings.push({
				name: 'tags',
				before: JSON.stringify(sourceTags, null, 2),
				after: JSON.stringify(targetTags, null, 2),
			});
		}

		return settings;
	});

	// Node changes with types
	const nodeChanges = computed(() => {
		if (!nodesDiff.value) return [];
		return [...nodesDiff.value.values()]
			.filter((change) => change.status !== NodeDiffStatus.Eq)
			.map((change) => ({
				...change,
				type: nodeTypesStore.getNodeType(change.node.type, change.node.typeVersion),
			}));
	});

	// Navigation
	function nextNodeChange() {
		const currentIndex = nodeChanges.value.findIndex(
			(change) => change.node.id === selectedDetailId.value,
		);

		const nextIndex = (currentIndex + 1) % nodeChanges.value.length;
		selectedDetailId.value = nodeChanges.value[nextIndex]?.node.id;

		onNavigate?.('next');
	}

	function previousNodeChange() {
		const currentIndex = nodeChanges.value.findIndex(
			(change) => change.node.id === selectedDetailId.value,
		);

		const previousIndex = (currentIndex - 1 + nodeChanges.value.length) % nodeChanges.value.length;
		selectedDetailId.value = nodeChanges.value[previousIndex]?.node.id;

		onNavigate?.('previous');
	}

	// Tabs
	const activeTab = ref<'nodes' | 'connectors' | 'settings'>();

	const tabs = computed(() => [
		{
			value: 'nodes' as const,
			label: i18n.baseText('workflowDiff.nodes'),
			disabled: false,
			data: {
				count: nodeChanges.value.length,
			},
		},
		{
			value: 'connectors' as const,
			label: i18n.baseText('workflowDiff.connectors'),
			disabled: false,
			data: {
				count: connectionsDiff.value.size,
			},
		},
		{
			value: 'settings' as const,
			label: i18n.baseText('workflowDiff.settings'),
			disabled: false,
			data: {
				count: settingsDiff.value.length,
			},
		},
	]);

	function setActiveTab(active: boolean) {
		if (!active) {
			activeTab.value = undefined;
			return;
		}
		activeTab.value = 'nodes';
		onTabChange?.('nodes');
	}

	// Selected node
	const selectedNode = computed<INodeUi | undefined>(() => {
		if (!selectedDetailId.value) return undefined;

		const node = nodesDiff.value.get(selectedDetailId.value)?.node;
		if (!node) return undefined;

		return node;
	});

	// Node diffs for aside panel
	const nodeDiffs = computed(() => {
		if (!selectedDetailId.value) {
			return {
				oldString: '',
				newString: '',
			};
		}
		const sourceNode = sourceWorkflow.value?.nodes.find(
			(node) => node.id === selectedDetailId.value,
		);
		const targetNode = targetWorkflow.value?.nodes.find(
			(node) => node.id === selectedDetailId.value,
		);

		function replacer(key: string, value: unknown, nodeType?: string) {
			if (key === 'position') {
				return undefined;
			}

			if (
				(key === 'jsCode' || (key === 'content' && nodeType === STICKY_NODE_TYPE)) &&
				typeof value === 'string'
			) {
				return value.split('\n');
			}

			return value;
		}

		const withNodeType = (type?: string) => (key: string, value: unknown) =>
			replacer(key, value, type);

		return {
			oldString: JSON.stringify(sourceNode, withNodeType(sourceNode?.type), 2) ?? '',
			newString: JSON.stringify(targetNode, withNodeType(targetNode?.type), 2) ?? '',
		};
	});

	// Counts
	const changesCount = computed(
		() => nodeChanges.value.length + connectionsDiff.value.size + settingsDiff.value.length,
	);

	const isSourceWorkflowNew = computed(() => {
		const sourceExists = !!sourceWorkflow.value;
		const targetExists = !!targetWorkflow.value;
		return !sourceExists && targetExists;
	});

	// Dropdown modifiers for popper
	const modifiers = [
		{
			name: 'preventOverflow',
			options: {
				boundary: 'viewport',
				padding: 8,
			},
		},
		{
			name: 'offset',
			options: {
				offset: [80, 8],
			},
		},
	];

	function setSelectedDetailId(nodeId: string | undefined) {
		selectedDetailId.value = nodeId;
	}

	return {
		settingsDiff,
		nodeChanges,
		nextNodeChange,
		previousNodeChange,
		activeTab,
		tabs,
		setActiveTab,
		selectedNode,
		nodeDiffs,
		changesCount,
		isSourceWorkflowNew,
		modifiers,
		setSelectedDetailId,
	};
}
