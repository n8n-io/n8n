<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useDebounceFn, useIntervalFn, useMediaQuery, useStorage } from '@vueuse/core';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import type {
	AgentCodingAction,
	AgentCodingConfig,
	AgentCodingFile,
	AgentCodingStatus,
	AgentCodingSessionSummary,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nResizeWrapper,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { getDebounceTime } from '@n8n/composables/useDebounce';

import { DEBOUNCE_TIME } from '@/app/constants';
import { TIME } from '@/app/constants/durations';
import ChatHistoryDropdownTrigger from '@/features/ai/shared/components/ChatHistoryDropdownTrigger.vue';
import { createAgentCodingApi } from '../agentCoding.api';
import AgentSessionHistoryDropdown from './AgentSessionHistoryDropdown.vue';
import AgentCustomToolViewer from './AgentCustomToolViewer.vue';
import AgentCodingDiff from './AgentCodingDiff.vue';
import AgentCodingChangeTree from './AgentCodingChangeTree.vue';
import {
	CODING_OPEN_FILE,
	formatCodingReview,
	type CodingReviewComment,
} from '../utils/coding-review';
import { codingPreviewCopy } from '../utils/coding-preview-state';
import { useCodingPreview } from '../composables/useCodingPreview';
import { useFollowScroll } from '../composables/useFollowScroll';

interface FileTab {
	id: string;
	kind: 'file' | 'diff';
	path: string;
}
type WorkspaceTab = FileTab | { id: 'preview'; kind: 'preview' };
interface FileContent {
	content?: string;
	revision?: string;
	error?: string;
}

const props = defineProps<{
	projectId: string;
	agentId: string;
	config: AgentCodingConfig;
	canExecute: boolean;
	session?: AgentCodingSessionSummary;
	chatId?: string;
	creatingChat?: boolean;
	otherPreview?: string;
	streaming?: boolean;
	sendReview: (message: string) => Promise<boolean>;
}>();
const emit = defineEmits<{
	'add-to-chat': [context: string];
	'new-chat': [];
	'chat-select': [id: string];
	changed: [];
	reopen: [];
}>();
const i18n = useI18n();
const rootStore = useRootStore();
const { showError } = useToast();
const api = computed(() =>
	createAgentCodingApi(rootStore.restApiContext, props.projectId, props.agentId, props.session?.id),
);
const chatOptions = computed(() =>
	(props.session?.chats ?? [])
		.map((chat, index) => ({
			id: chat.id,
			title:
				chat.title ||
				i18n.baseText('agents.coding.chat.untitled', { interpolate: { number: index + 1 } }),
		}))
		.reverse(),
);
const chatTitle = computed(() => chatOptions.value.find((chat) => chat.id === props.chatId)?.title);
const status = ref<AgentCodingStatus>();
const busy = ref(false);
const error = ref('');
const storageKey = `n8n-coding-view:${props.projectId}:${props.agentId}:${props.session?.id ?? 'repository'}`;
const saved = useStorage<{
	activeTab: string;
	openTabs: WorkspaceTab[];
	treeTab: 'changes' | 'files';
	directory: string;
	logsOpen: boolean;
	logStream: 'setup' | 'app' | 'check';
}>(
	storageKey,
	{
		activeTab: 'chat',
		openTabs: [],
		treeTab: 'changes',
		directory: '',
		logsOpen: false,
		logStream: 'app',
	},
	undefined,
	{ mergeDefaults: true, listenToStorageChanges: false },
);
const review = useStorage<{
	comments: CodingReviewComment[];
	summary: string;
	viewed: Record<string, string>;
}>(`${storageKey}:review`, { comments: [], summary: '', viewed: {} });
const reviewSending = ref(false);
const reviewOpen = ref(false);
const sessionWorking = computed(() => props.streaming || props.session?.activity === 'running');
const reviewDisabled = computed(
	() =>
		!props.canExecute ||
		busy.value ||
		reviewSending.value ||
		sessionWorking.value ||
		Boolean(props.session?.archivedAt) ||
		status.value?.phase !== 'ready',
);
const totalStats = computed(() =>
	(status.value?.changes ?? []).reduce(
		(sum, change) => ({
			additions: sum.additions + change.additions,
			deletions: sum.deletions + change.deletions,
		}),
		{ additions: 0, deletions: 0 },
	),
);
const viewedPaths = computed(() =>
	(status.value?.changes ?? [])
		.filter((change) => review.value.viewed[change.path])
		.map((change) => change.path),
);
const documents = ref<Record<string, FileContent>>({});
const fileRequests = new Map<string, symbol>();
const fileTabs = computed(() =>
	saved.value.openTabs
		.filter((tab): tab is FileTab => tab.kind !== 'preview')
		.map((tab) => ({ ...tab, data: documents.value[tab.id] })),
);
const activeFile = computed(() => fileTabs.value.find((tab) => tab.id === saved.value.activeTab));
const previewOpen = computed(() => saved.value.openTabs.some((tab) => tab.kind === 'preview'));
const tabList = ref<HTMLElement>();
const logsOpen = ref(saved.value.logsOpen);
const logStream = ref(saved.value.logStream);
const logs = ref('');
const logOutput = ref<HTMLElement>();
const { followEnd: followLogEnd } = useFollowScroll(logOutput, logs);
const directory = ref(saved.value.directory);
const search = ref('');
const files = ref<AgentCodingFile[]>([]);
const commitMessage = ref('');
const narrow = useMediaQuery('(max-width: 48rem)');
const mobileFiles = ref(false);
const fileListVisible = useStorage('n8n-coding-file-list-visible', true);
const filesShown = computed(() => (narrow.value ? mobileFiles.value : fileListVisible.value));
const fileListWidth = useStorage('n8n-coding-navigator-width', 448);
if (fileListWidth.value === 256 || fileListWidth.value === 384) fileListWidth.value = 448;
const logsHeight = useStorage('n8n-coding-logs-height', 180);
let refreshing = false;
let active = true;
const phaseLabels = computed(() => ({
	not_started: i18n.baseText('agents.coding.status.notStarted'),
	cloning: i18n.baseText('agents.coding.status.cloning'),
	installing: i18n.baseText('agents.coding.status.installing'),
	ready: i18n.baseText('agents.coding.status.ready'),
	error: i18n.baseText('agents.coding.status.error'),
	stopped: i18n.baseText('agents.coding.status.stopped'),
	restarted: i18n.baseText('agents.coding.status.restarted'),
}));
const appLabels = computed(() => ({
	stopped: i18n.baseText('agents.coding.app.stopped'),
	starting: i18n.baseText('agents.coding.app.starting'),
	running: i18n.baseText('agents.coding.app.running'),
	error: i18n.baseText('agents.coding.app.error'),
}));
const checkLabels = computed(() => ({
	not_started: i18n.baseText('agents.coding.check.notStarted'),
	running: i18n.baseText('agents.coding.check.running'),
	passed: i18n.baseText('agents.coding.check.passed'),
	failed: i18n.baseText('agents.coding.check.failed'),
	stopped: i18n.baseText('agents.coding.check.stopped'),
}));
const preparing = computed(
	() => status.value?.phase === 'cloning' || status.value?.phase === 'installing',
);
const appActive = computed(
	() => status.value?.app === 'starting' || status.value?.app === 'running',
);
const {
	url: previewUrl,
	state: previewState,
	load: loadPreview,
	clear: clearPreview,
	markUnavailable: markPreviewUnavailable,
} = useCodingPreview({
	fetchPreview: async () => await api.value.preview(),
	isOpen: () => previewOpen.value,
	canExecute: () => props.canExecute,
	app: () => status.value?.app,
	onError: (cause) => showError(cause, i18n.baseText('agents.coding.previewFailed')),
});
const previewCopy = computed(() =>
	previewState.value === 'ready'
		? undefined
		: codingPreviewCopy(i18n, previewState.value, props.otherPreview),
);
const runLabel = computed(() => {
	if (appActive.value) return i18n.baseText('agents.coding.app.restart');
	if (props.otherPreview) return i18n.baseText('agents.coding.app.replace');
	return i18n.baseText('agents.coding.app.run');
});
const repositoryName = computed(() =>
	props.config.repositoryUrl
		.replace(/\.git$/, '')
		.split('/')
		.slice(-2)
		.join('/'),
);
const visibleFiles = computed(() =>
	files.value.filter((file) => file.path.toLowerCase().includes(search.value.toLowerCase())),
);

function tabLabel(tab: WorkspaceTab) {
	if (tab.kind === 'preview') return i18n.baseText('agents.coding.app.title');
	return tab.path.split('/').pop() || tab.path;
}

function tabTitle(tab: WorkspaceTab) {
	if (tab.kind === 'preview') return i18n.baseText('agents.coding.app.title');
	if (tab.kind === 'diff')
		return i18n.baseText('agents.coding.tabs.diff', { interpolate: { path: tab.path } });
	return tab.path;
}

function tabIcon(tab: WorkspaceTab) {
	if (tab.kind === 'preview') return 'globe';
	if (tab.kind === 'diff') return 'file-diff';
	return 'file-code';
}

function tabTrigger(id: string) {
	return [...(tabList.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])].find(
		(trigger) => trigger.dataset.tabId === id,
	);
}

async function refresh() {
	if (refreshing) return;
	refreshing = true;
	try {
		const next = await api.value.status();
		if (!active) return;
		status.value = next;
		error.value = '';
		if (logsOpen.value) {
			const stream = logStream.value;
			const output = await api.value.logs(stream);
			if (active && stream === logStream.value) logs.value = output.content;
		}
		if (next.phase === 'ready' && active) {
			if (saved.value.treeTab === 'files') await loadFiles();
			if (activeFile.value) await loadDocument(activeFile.value);
		}
	} catch (cause) {
		if (active) error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		refreshing = false;
	}
}

async function act(action: AgentCodingAction) {
	if (!props.canExecute || busy.value || props.session?.archivedAt) return false;
	busy.value = true;
	error.value = '';
	try {
		await api.value.action(action);
		if (action.action === 'prepare') logStream.value = 'setup';
		if (action.action === 'start') logStream.value = 'app';
		if (action.action === 'stop') clearPreview();
		if (action.action === 'commit') commitMessage.value = '';
		if (action.action === 'check') logStream.value = 'check';
		await refresh();
		emit('changed');
		if (action.action === 'start') openPreview();
		return true;
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause);
		showError(cause, i18n.baseText('agents.coding.actionFailed'));
		return false;
	} finally {
		busy.value = false;
	}
}

async function restartApp() {
	if (await act({ action: 'stop' })) await act({ action: 'start' });
}

async function loadFiles() {
	if (!status.value?.branch) return;
	try {
		const folder = directory.value;
		const query = search.value;
		const result = await api.value.files(folder, query);
		if (active && folder === directory.value && query === search.value) files.value = result;
	} catch (cause) {
		if (active) showError(cause, i18n.baseText('agents.coding.filesFailed'));
	}
}

async function loadDocument(tab: FileTab) {
	if (!active || status.value?.phase !== 'ready' || fileRequests.has(tab.id)) return;
	const request = Symbol();
	fileRequests.set(tab.id, request);
	try {
		const result =
			tab.kind === 'diff'
				? await api.value.diff(tab.path)
				: { ...(await api.value.file(tab.path)), revision: undefined };
		if (!active || fileRequests.get(tab.id) !== request) return;
		const openTab = saved.value.openTabs.find((item) => item.id === tab.id);
		if (!openTab || openTab.kind === 'preview') return;
		openTab.path = result.path;
		const { revision } = result;
		documents.value[tab.id] = { content: result.content, revision };
		if (revision && review.value.viewed[result.path] !== revision)
			delete review.value.viewed[result.path];
	} catch (cause) {
		if (!active || fileRequests.get(tab.id) !== request) return;
		documents.value[tab.id] = {
			...documents.value[tab.id],
			error: cause instanceof Error ? cause.message : String(cause),
		};
	} finally {
		if (fileRequests.get(tab.id) === request) fileRequests.delete(tab.id);
	}
}

function selectTab(id: string | number) {
	if (typeof id !== 'string') return;
	saved.value.activeTab = id;
	mobileFiles.value = false;
	if (activeFile.value) void loadDocument(activeFile.value);
	if (id === 'preview') void loadPreview();
}

function selectChat(id: string) {
	selectTab('chat');
	emit('chat-select', id);
}

function openDocument(path: string, kind: FileTab['kind']) {
	let tab = saved.value.openTabs.find(
		(item) => item.kind !== 'preview' && item.kind === kind && item.path === path,
	);
	if (!tab) {
		tab = { id: `${kind}:${path}`, kind, path };
		saved.value.openTabs.push(tab);
	}
	saved.value.treeTab = kind === 'diff' ? 'changes' : 'files';
	selectTab(tab.id);
}

async function openFile(file: AgentCodingFile) {
	if (file.type === 'directory') {
		directory.value = file.path;
		search.value = '';
		await loadFiles();
		return;
	}
	openDocument(file.path, 'file');
}

function openDiff(path: string) {
	openDocument(path, 'diff');
}

function openPreview() {
	if (!previewOpen.value) saved.value.openTabs.push({ id: 'preview', kind: 'preview' });
	selectTab('preview');
}

async function closeTab(id: string) {
	const index = saved.value.openTabs.findIndex((tab) => tab.id === id);
	if (index < 0) return;
	saved.value.openTabs.splice(index, 1);
	fileRequests.delete(id);
	delete documents.value[id];
	if (id === 'preview') clearPreview();
	if (saved.value.activeTab === id) selectTab(saved.value.openTabs[index - 1]?.id ?? 'chat');
	await nextTick();
	tabTrigger(saved.value.activeTab)?.focus();
}

function addToChat(file: FileTab, event: MouseEvent) {
	const data = documents.value[file.id];
	if (data?.content === undefined) return;
	const container =
		event.currentTarget instanceof HTMLElement
			? event.currentTarget.closest('[data-coding-file]')
			: null;
	const selection = window.getSelection();
	const highlighted =
		selection?.anchorNode && container?.contains(selection.anchorNode) ? selection.toString() : '';
	const content = (highlighted || data.content).slice(0, 16000);
	void addContextToChat(
		`${file.path}\n\n\`\`\`${file.kind === 'diff' ? 'diff' : ''}\n${content}\n\`\`\``,
	);
}

async function addContextToChat(context: string) {
	selectTab('chat');
	await nextTick();
	emit('add-to-chat', context);
}

function toggleFiles() {
	if (narrow.value) mobileFiles.value = !mobileFiles.value;
	else fileListVisible.value = !fileListVisible.value;
}

function showChanges() {
	saved.value.treeTab = 'changes';
	fileListVisible.value = true;
	mobileFiles.value = true;
}

async function openApp() {
	// Open the window before the request, so that the browser does not block it.
	const popup = window.open('', '_blank');
	try {
		const preview = await api.value.preview();
		if (!preview.available) {
			// The preview panel explains this expected state. It is not an error.
			popup?.close();
			markPreviewUnavailable();
			openPreview();
			return;
		}
		if (popup) {
			popup.opener = null;
			popup.location.href = preview.url;
		}
	} catch (cause) {
		popup?.close();
		showError(cause, i18n.baseText('agents.coding.previewFailed'));
	}
}

function markViewed(file: FileTab, value: boolean) {
	const revision = documents.value[file.id]?.revision;
	if (!revision) return;
	if (value) review.value.viewed[file.path] = revision;
	else delete review.value.viewed[file.path];
}

async function submitReview() {
	if (reviewDisabled.value || (!review.value.comments.length && !review.value.summary.trim()))
		return;
	const comments = [...review.value.comments];
	const summary = review.value.summary;
	const message = `${i18n.baseText('agents.coding.review.instructions')}\n\n${formatCodingReview(comments, summary)}`;
	reviewSending.value = true;
	try {
		selectTab('chat');
		await nextTick();
		if (!(await props.sendReview(message))) {
			error.value = i18n.baseText('agents.coding.review.sendFailed');
			return;
		}
		const sentIds = new Set(comments.map((comment) => comment.id));
		review.value.comments = review.value.comments.filter((comment) => !sentIds.has(comment.id));
		if (review.value.summary === summary) review.value.summary = '';
		reviewOpen.value = false;
		emit('changed');
	} catch (cause) {
		showError(cause, i18n.baseText('agents.coding.actionFailed'));
	} finally {
		reviewSending.value = false;
	}
}

provide(CODING_OPEN_FILE, (path: string) => openDocument(path, 'file'));
watch(
	() => props.chatId,
	() => selectTab('chat'),
);
watch([directory, logsOpen, logStream], () => {
	Object.assign(saved.value, {
		directory: directory.value,
		logsOpen: logsOpen.value,
		logStream: logStream.value,
	});
});
watch(sessionWorking, (working) => {
	if (working) review.value.viewed = {};
});
watch(
	() => props.session?.status,
	(value) => {
		if (value) status.value = value;
	},
	{ immediate: true },
);
watch(
	() => saved.value.activeTab,
	async (id) => {
		await nextTick();
		tabTrigger(id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
	},
);
watch(
	() => saved.value.treeTab,
	(tab) => {
		if (tab === 'files') void loadFiles();
	},
);
watch(
	appActive,
	(running) => {
		if (running) void loadPreview();
		else clearPreview();
	},
	{ immediate: true },
);
const searchFiles = useDebounceFn(loadFiles, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
watch(search, () => {
	void searchFiles();
});
watch([logStream, logsOpen], () => {
	// Another stream, or the panel that opens again, starts at the end of its output.
	void followLogEnd();
	void refresh();
});
useIntervalFn(() => {
	void refresh();
}, 3 * TIME.SECOND);
onMounted(() => {
	void refresh();
});
onBeforeUnmount(() => {
	active = false;
});
</script>

<template>
	<div :class="$style.coding" data-testid="agent-coding-workspace">
		<div v-if="status?.phase !== 'ready'" :class="$style.prepareBar">
			<span :class="$style.status" :data-state="status?.phase">{{
				phaseLabels[status?.phase ?? 'not_started']
			}}</span>
			<N8nButton
				variant="outline"
				size="xsmall"
				:disabled="!canExecute || busy || preparing || Boolean(session?.archivedAt)"
				@click="act({ action: 'prepare' })"
				>{{ i18n.baseText('agents.coding.prepare') }}</N8nButton
			>
		</div>
		<div v-if="session?.archivedAt" :class="$style.archiveBanner">
			<N8nText size="small">{{ i18n.baseText('agents.coding.sessions.archivedHint') }}</N8nText
			><N8nButton size="small" variant="outline" :disabled="!canExecute" @click="emit('reopen')">{{
				i18n.baseText('agents.coding.sessions.reopen')
			}}</N8nButton>
		</div>
		<div v-if="error" :class="$style.error" role="alert">{{ error }}</div>
		<div :class="$style.body">
			<TabsRoot
				v-show="!narrow || !filesShown"
				:model-value="saved.activeTab"
				:class="$style.center"
				@update:model-value="selectTab"
			>
				<div :class="$style.tabHeader">
					<TabsList as-child :aria-label="i18n.baseText('agents.coding.tabs.title')">
						<div ref="tabList" :class="$style.tabList">
							<TabsTrigger
								value="chat"
								data-tab-id="chat"
								:class="[$style.tabTrigger, $style.chatTab]"
							>
								<N8nIcon icon="message-circle" size="small" />
								<span>{{ i18n.baseText('agents.coding.chat') }}</span>
							</TabsTrigger>
							<div
								v-for="item in saved.openTabs"
								:key="item.id"
								:class="[$style.tab, { [$style.activeTab]: saved.activeTab === item.id }]"
							>
								<TabsTrigger
									:value="item.id"
									:data-tab-id="item.id"
									:class="$style.tabTrigger"
									:title="tabTitle(item)"
									:aria-label="tabTitle(item)"
									@keydown.delete.prevent="closeTab(item.id)"
								>
									<N8nIcon :icon="tabIcon(item)" size="small" />
									<span>{{ tabLabel(item) }}</span>
								</TabsTrigger>
								<N8nIconButton
									icon="x"
									variant="ghost"
									size="xsmall"
									:class="$style.closeTab"
									:aria-label="
										i18n.baseText('agents.coding.tabs.close', {
											interpolate: { name: tabTitle(item) },
										})
									"
									@click="closeTab(item.id)"
								/>
							</div>
						</div>
					</TabsList>
					<div :class="$style.tabActions">
						<AgentSessionHistoryDropdown
							v-if="chatOptions.length > 1"
							:session-options="chatOptions"
							@select="selectChat"
						>
							<template #trigger>
								<ChatHistoryDropdownTrigger :title="chatTitle" :class="$style.chatHistory" />
							</template>
						</AgentSessionHistoryDropdown>
						<N8nButton
							icon="message-circle-plus"
							variant="ghost"
							size="xsmall"
							:loading="creatingChat"
							:disabled="
								!canExecute || !session || Boolean(session.archivedAt) || status?.phase !== 'ready'
							"
							@click="emit('new-chat')"
							>{{ i18n.baseText('agents.coding.chat.new') }}</N8nButton
						>
						<N8nButton
							v-if="!previewOpen"
							icon="globe"
							variant="ghost"
							size="xsmall"
							data-testid="agent-coding-open-preview"
							@click="openPreview"
							>{{ i18n.baseText('agents.coding.app.title') }}</N8nButton
						>
						<N8nTooltip :content="i18n.baseText('agents.coding.toggleFiles')" as-child>
							<N8nIconButton
								icon="panel-right"
								variant="ghost"
								size="xsmall"
								:aria-label="i18n.baseText('agents.coding.toggleFiles')"
								:aria-expanded="filesShown"
								aria-controls="agent-coding-files"
								@click="toggleFiles"
							/>
						</N8nTooltip>
					</div>
				</div>
				<TabsContent
					value="chat"
					force-mount
					v-show="saved.activeTab === 'chat'"
					:class="$style.chat"
				>
					<slot />
					<button
						v-if="status?.changes.length"
						type="button"
						:class="$style.changesStrip"
						@click="showChanges"
					>
						<N8nIcon icon="git-branch" size="small" />
						<span>{{
							i18n.baseText('agents.coding.review.filesChanged', {
								interpolate: { count: status.changes.length },
							})
						}}</span>
						<span :class="$style.additions">+{{ totalStats.additions }}</span>
						<span :class="$style.deletions">−{{ totalStats.deletions }}</span>
						<span :class="$style.reviewLink"
							>{{ i18n.baseText('agents.coding.review.open') }} →</span
						>
					</button>
				</TabsContent>
				<TabsContent
					v-for="file in fileTabs"
					:key="file.id"
					:value="file.id"
					force-mount
					v-show="saved.activeTab === file.id"
					:class="$style.viewer"
					data-coding-file
				>
					<div :class="$style.fileToolbar">
						<N8nText size="small" :class="$style.filePath" :title="file.path">{{
							file.path
						}}</N8nText>
						<N8nButton
							variant="ghost"
							size="xsmall"
							:disabled="file.data?.content === undefined"
							@click="addToChat(file, $event)"
							>{{ i18n.baseText('agents.coding.addToChat') }}</N8nButton
						>
						<N8nButton
							v-if="status?.uncommittedPaths.includes(file.path)"
							variant="ghost"
							size="xsmall"
							:disabled="reviewDisabled"
							@click="act({ action: 'undo', path: file.path })"
							>{{ i18n.baseText('agents.coding.undoFile') }}</N8nButton
						>
					</div>
					<div v-if="file.data?.error" :class="$style.fileError" role="alert">
						<N8nText size="small">{{ file.data.error }}</N8nText>
						<N8nButton size="xsmall" variant="ghost" @click="loadDocument(file)">{{
							i18n.baseText('agents.coding.refresh')
						}}</N8nButton>
					</div>
					<template v-if="file.data?.content !== undefined">
						<AgentCodingDiff
							v-if="file.kind === 'diff'"
							:path="file.path"
							:content="file.data.content"
							:revision="file.data.revision ?? ''"
							:comments="review.comments.filter((comment) => comment.path === file.path)"
							:viewed="
								Boolean(review.viewed[file.path] && review.viewed[file.path] === file.data.revision)
							"
							:disabled="reviewDisabled"
							@comment="review.comments.push($event)"
							@remove="review.comments = review.comments.filter((comment) => comment.id !== $event)"
							@viewed="markViewed(file, $event)"
						/>
						<AgentCustomToolViewer v-else :code="file.data.content" :class="$style.source" />
					</template>
					<div v-else-if="!file.data?.error" :class="$style.empty" role="status">
						<N8nText color="text-light">{{ i18n.baseText('generic.loading') }}</N8nText>
					</div>
				</TabsContent>
				<TabsContent
					v-if="previewOpen"
					value="preview"
					force-mount
					v-show="saved.activeTab === 'preview'"
					:class="$style.appPanel"
				>
					<iframe
						v-if="previewState === 'ready'"
						:src="previewUrl"
						:title="i18n.baseText('agents.coding.app.title')"
						:class="$style.frame"
					/>
					<div
						v-else-if="previewCopy"
						:class="$style.empty"
						role="status"
						data-testid="agent-coding-preview-state"
						:data-state="previewState"
					>
						<N8nIcon icon="globe" size="xlarge" />
						<N8nText tag="h3" bold>{{ previewCopy.title }}</N8nText>
						<N8nText v-if="previewCopy.hint" color="text-light">{{ previewCopy.hint }}</N8nText>
						<N8nButton
							v-if="previewCopy.offersRun"
							:disabled="
								!canExecute || busy || Boolean(session?.archivedAt) || status?.phase !== 'ready'
							"
							@click="act({ action: 'start' })"
							>{{ runLabel }}</N8nButton
						>
						<N8nButton
							v-else-if="previewState === 'unavailable'"
							variant="outline"
							@click="
								logStream = 'app';
								logsOpen = true;
							"
							>{{ i18n.baseText('agents.coding.app.showLogs') }}</N8nButton
						>
						<N8nButton
							v-else-if="previewState === 'failed' || previewState === 'running'"
							variant="outline"
							:disabled="!canExecute"
							@click="loadPreview"
							>{{ i18n.baseText('agents.coding.app.show') }}</N8nButton
						>
					</div>
				</TabsContent>
				<div :class="$style.logHeader">
					<div :class="$style.logTabs">
						<N8nTooltip :content="i18n.baseText('agents.coding.logs')" as-child>
							<N8nButton
								variant="ghost"
								size="xsmall"
								icon="terminal"
								:icon-only="logsOpen"
								:aria-label="i18n.baseText('agents.coding.logs')"
								:aria-expanded="logsOpen"
								@click="logsOpen = !logsOpen"
								><span v-if="!logsOpen">{{ i18n.baseText('agents.coding.logs') }}</span></N8nButton
							>
						</N8nTooltip>
						<template v-if="logsOpen">
							<N8nButton
								:variant="logStream === 'setup' ? 'outline' : 'ghost'"
								size="xsmall"
								:aria-pressed="logStream === 'setup'"
								@click="logStream = 'setup'"
								>{{ i18n.baseText('agents.coding.setupLogs') }}</N8nButton
							>
							<N8nTooltip :content="appLabels[status?.app ?? 'stopped']" as-child>
								<N8nButton
									:variant="logStream === 'app' ? 'outline' : 'ghost'"
									size="xsmall"
									:aria-label="appLabels[status?.app ?? 'stopped']"
									:aria-pressed="logStream === 'app'"
									@click="logStream = 'app'"
								>
									<span :class="$style.logStatus" :data-state="status?.app" aria-hidden="true" />
									{{ i18n.baseText('agents.coding.appLogs') }}
								</N8nButton>
							</N8nTooltip>
							<N8nTooltip :content="checkLabels[status?.check ?? 'not_started']" as-child>
								<N8nButton
									:variant="logStream === 'check' ? 'outline' : 'ghost'"
									size="xsmall"
									:aria-label="checkLabels[status?.check ?? 'not_started']"
									:aria-pressed="logStream === 'check'"
									@click="logStream = 'check'"
								>
									<span :class="$style.logStatus" :data-state="status?.check" aria-hidden="true" />
									{{ i18n.baseText('agents.coding.checkLogs') }}
								</N8nButton>
							</N8nTooltip>
						</template>
					</div>
					<div :class="$style.runActions">
						<N8nTooltip
							v-if="logsOpen"
							:content="i18n.baseText('agents.coding.addToChat')"
							as-child
						>
							<N8nIconButton
								icon="message-circle-plus"
								variant="ghost"
								size="xsmall"
								:disabled="!logs"
								:aria-label="i18n.baseText('agents.coding.addToChat')"
								@click="addContextToChat(`${logStream}\n\n${logs.slice(-16000)}`)"
							/>
						</N8nTooltip>
						<N8nTooltip
							v-if="config.checkCommand && logsOpen"
							:content="i18n.baseText('agents.coding.check.run')"
							as-child
						>
							<N8nIconButton
								icon="list-checks"
								variant="ghost"
								size="xsmall"
								:aria-label="i18n.baseText('agents.coding.check.run')"
								:disabled="
									!canExecute ||
									busy ||
									Boolean(session?.archivedAt) ||
									status?.phase !== 'ready' ||
									status?.check === 'running'
								"
								@click="act({ action: 'check' })"
							/>
						</N8nTooltip>
						<N8nTooltip :content="runLabel" as-child>
							<N8nButton
								variant="ghost"
								size="xsmall"
								:icon="appActive ? 'refresh-cw' : 'play'"
								:icon-only="appActive"
								:aria-label="runLabel"
								:disabled="
									!canExecute || busy || Boolean(session?.archivedAt) || status?.phase !== 'ready'
								"
								data-testid="agent-coding-run-app"
								@click="appActive ? restartApp() : act({ action: 'start' })"
								><span v-if="!appActive">{{ runLabel }}</span></N8nButton
							>
						</N8nTooltip>
						<N8nTooltip
							v-if="appActive"
							:content="i18n.baseText('agents.coding.app.stop')"
							as-child
						>
							<N8nIconButton
								icon="square"
								variant="ghost"
								size="xsmall"
								:disabled="!canExecute || busy"
								:aria-label="i18n.baseText('agents.coding.app.stop')"
								@click="act({ action: 'stop' })"
							/>
						</N8nTooltip>
						<N8nTooltip :content="i18n.baseText('agents.coding.app.openExternal')" as-child>
							<N8nIconButton
								icon="external-link"
								variant="ghost"
								size="xsmall"
								:disabled="!canExecute || !appActive || previewState === 'unavailable'"
								:aria-label="i18n.baseText('agents.coding.app.openExternal')"
								data-testid="agent-coding-open-app"
								@click="openApp"
							/>
						</N8nTooltip>
					</div>
				</div>
				<N8nResizeWrapper
					v-if="logsOpen"
					:class="$style.logResize"
					:style="{ height: `${logsHeight}px` }"
					:height="logsHeight"
					:min-height="80"
					:max-height="500"
					:default-height="180"
					:supported-directions="['top']"
					@resize="logsHeight = $event.height"
				>
					<pre ref="logOutput" :class="$style.logs" data-testid="agent-coding-logs">{{
						logs || i18n.baseText('agents.coding.noLogs')
					}}</pre>
				</N8nResizeWrapper>
			</TabsRoot>
			<N8nResizeWrapper
				v-show="filesShown"
				id="agent-coding-files"
				:class="$style.fileListResize"
				:style="{ width: narrow ? '100%' : `${fileListWidth}px` }"
				:width="narrow ? undefined : fileListWidth"
				:min-width="224"
				:max-width="560"
				:default-width="448"
				:is-resizing-enabled="!narrow"
				:supported-directions="['left']"
				@resize="fileListWidth = $event.width"
			>
				<aside
					:class="$style.navigator"
					:aria-label="i18n.baseText('agents.coding.repositoryPanel')"
				>
					<nav
						:class="$style.treeTabs"
						:aria-label="i18n.baseText('agents.coding.repositoryPanel')"
					>
						<N8nIconButton
							v-if="narrow"
							icon="chevron-left"
							variant="ghost"
							size="xsmall"
							:aria-label="i18n.baseText('agents.coding.toggleFiles')"
							@click="toggleFiles"
						/>
						<N8nButton
							:variant="saved.treeTab === 'files' ? 'outline' : 'ghost'"
							size="xsmall"
							:aria-pressed="saved.treeTab === 'files'"
							@click="saved.treeTab = 'files'"
							>{{ i18n.baseText('agents.coding.allFiles') }}</N8nButton
						>
						<N8nButton
							:variant="saved.treeTab === 'changes' ? 'outline' : 'ghost'"
							size="xsmall"
							:aria-pressed="saved.treeTab === 'changes'"
							@click="saved.treeTab = 'changes'"
						>
							{{ i18n.baseText('agents.coding.changes')
							}}<span :class="$style.tabCount">{{ status?.changes.length ?? 0 }}</span>
						</N8nButton>
						<N8nTooltip :content="i18n.baseText('agents.coding.refresh')" as-child>
							<N8nIconButton
								icon="refresh-cw"
								variant="ghost"
								size="xsmall"
								:class="$style.refresh"
								:aria-label="i18n.baseText('agents.coding.refresh')"
								@click="refresh"
							/>
						</N8nTooltip>
					</nav>
					<div :class="$style.fileList">
						<template v-if="saved.treeTab === 'files'">
							<N8nInput
								v-model="search"
								:placeholder="i18n.baseText('agents.coding.searchFiles')"
								:aria-label="i18n.baseText('agents.coding.searchFiles')"
								size="small"
							/>
							<N8nButton
								v-if="directory"
								variant="ghost"
								size="small"
								@click="
									directory = directory.split('/').slice(0, -1).join('/');
									loadFiles();
								"
								>{{ i18n.baseText('agents.coding.parentDirectory') }}</N8nButton
							>
							<N8nText
								size="small"
								color="text-light"
								:class="$style.directory"
								:title="directory || repositoryName"
								>{{ directory || repositoryName }}</N8nText
							>
							<button
								v-for="file in visibleFiles"
								:key="file.path"
								type="button"
								:class="[$style.fileItem, { [$style.selected]: activeFile?.path === file.path }]"
								:title="file.path"
								@click="openFile(file)"
							>
								<N8nIcon
									:icon="file.type === 'directory' ? 'folder' : 'file'"
									size="small"
								/><span>{{ search ? file.path : file.name }}</span>
							</button>
						</template>
						<template v-else>
							<div :class="$style.reviewProgress">
								<N8nText size="small" color="text-light">{{
									i18n.baseText('agents.coding.review.progress', {
										interpolate: { viewed: viewedPaths.length, total: status?.changes.length ?? 0 },
									})
								}}</N8nText>
							</div>
							<AgentCodingChangeTree
								:changes="status?.changes ?? []"
								:selected="activeFile?.path"
								:viewed="viewedPaths"
								@select="openDiff"
							/>
							<N8nText v-if="!status?.changes.length" color="text-light" size="small">{{
								i18n.baseText('agents.coding.noChanges')
							}}</N8nText>
						</template>
					</div>
					<div
						v-if="saved.treeTab === 'changes' && status?.phase === 'ready'"
						:class="$style.reviewBar"
					>
						<N8nButton
							variant="ghost"
							size="xsmall"
							:aria-expanded="reviewOpen"
							@click="reviewOpen = !reviewOpen"
							>{{
								i18n.baseText('agents.coding.review.comments', {
									interpolate: { count: review.comments.length },
								})
							}}</N8nButton
						>
						<N8nButton
							size="xsmall"
							:title="
								i18n.baseText(
									sessionWorking ? 'agents.coding.review.wait' : 'agents.coding.review.submitHint',
								)
							"
							:loading="reviewSending"
							:disabled="reviewDisabled || (!review.comments.length && !review.summary.trim())"
							data-testid="coding-send-review"
							@click="submitReview"
							>{{ i18n.baseText('agents.coding.review.send') }}</N8nButton
						>
					</div>
					<div v-if="reviewOpen && saved.treeTab === 'changes'" :class="$style.reviewSummary">
						<button
							v-for="comment in review.comments"
							:key="comment.id"
							type="button"
							:class="$style.reviewItem"
							@click="openDiff(comment.path)"
						>
							<strong>{{ comment.path }}:{{ comment.line }}</strong
							><span>{{ comment.body }}</span>
						</button>
						<N8nInput
							v-model="review.summary"
							type="textarea"
							:rows="2"
							:placeholder="i18n.baseText('agents.coding.review.summary')"
							:aria-label="i18n.baseText('agents.coding.review.summary')"
						/>
					</div>
					<details
						v-if="saved.treeTab === 'changes' && status?.phase === 'ready'"
						:class="$style.commitDetails"
					>
						<summary>{{ i18n.baseText('agents.coding.commitPush') }}</summary>
						<div :class="$style.commit">
							<N8nInput
								v-model="commitMessage"
								:placeholder="i18n.baseText('agents.coding.commitMessage')"
								:aria-label="i18n.baseText('agents.coding.commitMessage')"
								size="small"
							/>
							<N8nButton
								variant="outline"
								size="small"
								:disabled="reviewDisabled || !commitMessage.trim() || !status.uncommittedChanges"
								@click="act({ action: 'commit', message: commitMessage.trim() })"
								>{{ i18n.baseText('agents.coding.commitAll') }}</N8nButton
							>
							<N8nButton
								variant="ghost"
								size="small"
								:disabled="reviewDisabled"
								@click="act({ action: 'push' })"
								>{{ i18n.baseText('agents.coding.push') }}</N8nButton
							>
						</div>
					</details>
				</aside>
			</N8nResizeWrapper>
		</div>
	</div>
</template>

<style lang="scss" module>
.coding,
.center,
.chat,
.viewer,
.navigator {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
}
.coding {
	background: var(--background--surface);
}
.prepareBar,
.tabHeader,
.tabActions,
.treeTabs,
.fileToolbar,
.fileError,
.commit,
.logHeader,
.logTabs,
.runActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
.prepareBar {
	justify-content: space-between;
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-bottom: var(--border);
}
.status {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}
.status[data-state='error'],
.error,
.fileError {
	color: var(--text-color--danger);
}
.status[data-state='stopped'],
.status[data-state='restarted'] {
	color: var(--text-color--warning);
}
.error,
.fileError {
	padding: var(--spacing--xs);
	background: var(--background--subtle);
	font-size: var(--font-size--sm);
}
.fileError {
	justify-content: space-between;
	overflow-wrap: anywhere;
}
.body {
	display: flex;
	flex: 1;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}
.tabHeader,
.treeTabs,
.fileToolbar,
.logHeader {
	min-height: var(--height--lg);
	border-bottom: var(--border);
	flex-shrink: 0;
}
.tabHeader {
	padding-right: var(--spacing--2xs);
	gap: 0;
}
.tabList {
	display: flex;
	align-self: stretch;
	flex: 1;
	min-width: 0;
	overflow-x: auto;
	scrollbar-width: thin;
}
.tab {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	max-width: var(--spacing--5xl);
	padding-right: var(--spacing--4xs);
	border-right: var(--border);
	border-bottom: var(--border-width) solid transparent;
}
.tabTrigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	height: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: 0;
	background: transparent;
	color: var(--text-color--subtle);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	cursor: pointer;
}
.tabTrigger span,
.filePath,
.directory,
.fileItem span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.tabTrigger > :first-child,
.tabActions,
.closeTab {
	flex-shrink: 0;
}
.tabTrigger:focus-visible,
.fileItem:focus-visible,
.changesStrip:focus-visible {
	outline: var(--border-width) solid var(--color--primary);
	outline-offset: calc(-1 * var(--border-width));
}
.chatTab {
	flex-shrink: 0;
	border-right: var(--border);
	border-bottom: var(--border-width) solid transparent;
}
.activeTab,
.chatTab[data-state='active'] {
	background: var(--background--subtle);
	border-bottom-color: var(--color--primary);
}
.tabTrigger[data-state='active'] {
	color: var(--text-color);
}
.tab:hover,
.chatTab:hover {
	background: var(--background--subtle);
}
.tabActions {
	padding-left: var(--spacing--2xs);
}
.chatHistory {
	max-width: var(--spacing--5xl);
}
.treeTabs,
.fileToolbar,
.logHeader {
	padding: var(--spacing--4xs) var(--spacing--2xs);
}
.fileToolbar,
.logHeader {
	flex-wrap: wrap;
}
.refresh {
	margin-left: auto;
}
.tabCount {
	color: var(--text-color--subtler);
	font-variant-numeric: tabular-nums;
}
.appPanel {
	flex: 1;
	min-height: 0;
	min-width: 0;
	display: flex;
}
.frame {
	border: none;
	width: 100%;
	height: 100%;
}
.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	flex: 1;
}
.fileListResize {
	flex-shrink: 0;
	min-width: 0;
	max-width: 45%;
	border-left: var(--border);
}
.navigator {
	height: 100%;
}
.fileList {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: var(--spacing--4xs);
	min-height: 0;
	min-width: 0;
	padding: var(--spacing--2xs);
	overflow: auto;
}
.fileList > * {
	flex-shrink: 0;
}
.directory {
	padding: var(--spacing--2xs);
}
.fileItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	border: none;
	border-radius: var(--radius--3xs);
	background: transparent;
	padding: var(--spacing--2xs);
	text-align: left;
	cursor: pointer;
	color: var(--text-color);
	font-size: var(--font-size--2xs);
}
.fileItem:hover,
.selected {
	background: var(--background--subtle);
}
.filePath {
	flex: 1;
	min-width: var(--spacing--xl);
}
.source {
	flex: 1;
	min-height: 0;
}
.logs {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	margin: 0;
	overflow: auto;
	padding: var(--spacing--xs);
	height: 100%;
	min-height: var(--height--4xl);
	background: var(--background--subtle);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
.commit {
	flex-wrap: wrap;
	padding: var(--spacing--2xs);
	border-top: var(--border);
}
.commit > :first-child {
	flex-basis: 100%;
}
.logHeader {
	border-top: var(--border);
	border-bottom: 0;
}
.logTabs,
.runActions {
	flex-shrink: 0;
}
.runActions {
	margin-left: auto;
}
.logStatus {
	width: var(--height--5xs);
	height: var(--height--5xs);
	border-radius: var(--radius--full);
	background: var(--text-color--subtler);
}
.logStatus[data-state='starting'] {
	background: var(--text-color--warning);
}
.logStatus[data-state='running'],
.logStatus[data-state='passed'] {
	background: var(--text-color--success);
}
.logStatus[data-state='error'],
.logStatus[data-state='failed'] {
	background: var(--text-color--danger);
}
.logResize {
	flex-shrink: 0;
	min-height: 0;
	max-height: 50%;
}
.archiveBanner,
.changesStrip,
.reviewBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: 0;
	border-top: var(--border);
	background: var(--background--surface);
	font-size: var(--font-size--2xs);
	flex-shrink: 0;
}
.archiveBanner {
	background: var(--background--subtle);
}
.changesStrip {
	cursor: pointer;
	color: var(--text-color);
	text-align: left;
}
.reviewLink {
	margin-left: auto;
	font-weight: var(--font-weight--bold);
}
.additions {
	color: light-dark(var(--color--green-800), var(--diff--color--new));
}
.deletions {
	color: light-dark(var(--color--red-800), var(--diff--color--deleted));
}
.reviewProgress {
	padding: var(--spacing--2xs);
}
.reviewBar {
	flex-wrap: wrap;
	justify-content: space-between;
	gap: var(--spacing--4xs);
	padding-block: var(--spacing--4xs);
}
.reviewSummary {
	padding: var(--spacing--2xs);
	max-height: var(--spacing--5xl);
	overflow: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	border-top: var(--border);
}
.reviewItem {
	border: 0;
	border-radius: var(--radius--3xs);
	background: var(--background--subtle);
	padding: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	text-align: left;
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	overflow-wrap: anywhere;
	cursor: pointer;
}
.commitDetails {
	border-top: var(--border);
	font-size: var(--font-size--2xs);
}
.commitDetails summary {
	cursor: pointer;
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color--subtle);
}
@media (max-width: 48rem) {
	.fileListResize {
		max-width: 100%;
		border-left: 0;
	}
}
</style>
