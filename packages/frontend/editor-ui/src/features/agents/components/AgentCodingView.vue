<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useIntervalFn, useMediaQuery, useStorage } from '@vueuse/core';
import type {
	AgentCodingChat,
	AgentCodingConfig,
	AgentCodingSessionSummary,
	AgentCodingStatus,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TIME } from '@/app/constants/durations';
import { abbreviateNumber } from '@/app/utils/typesUtils';
import { createAgentCodingApi } from '../agentCoding.api';
import AgentCodingWorkspace from './AgentCodingWorkspace.vue';
import AgentModal from './modals/AgentModal.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	config: AgentCodingConfig;
	canExecute: boolean;
	sessionId?: string;
	streaming?: boolean;
	sendReview: (message: string) => Promise<boolean>;
}>();
const emit = defineEmits<{
	'add-to-chat': [context: string];
	'session-select': [chat: AgentCodingChat];
	back: [];
}>();
const i18n = useI18n();
const rootStore = useRootStore();
const api = computed(() =>
	createAgentCodingApi(rootStore.restApiContext, props.projectId, props.agentId),
);
const sessions = ref<AgentCodingSessionSummary[]>([]);
const branches = ref<string[]>([]);
const baseStatus = ref<AgentCodingStatus>();
const activeId = useStorage(
	`n8n-coding-session:${props.projectId}:${props.agentId}`,
	'',
	undefined,
	{
		listenToStorageChanges: false,
	},
);
const activeChatIds = useStorage<Record<string, string>>(
	`n8n-coding-active-chats:${props.projectId}:${props.agentId}`,
	{},
	undefined,
	{ listenToStorageChanges: false },
);
const sidebarOpen = useStorage('n8n-coding-sidebar-open', true);
const showArchived = ref(false);
const error = ref('');
const loading = ref(true);
const busy = ref(false);
const creatingChat = ref(false);
const dialog = ref(false);
const name = ref('');
const branch = ref('');
const baseBranch = ref('');
const createError = ref('');
const narrow = useMediaQuery('(max-width: 48rem)');
const mobileSidebar = ref(false);
const sidebarShown = computed(() => (narrow.value ? mobileSidebar.value : sidebarOpen.value));
const selected = computed(() => sessions.value.find((session) => session.id === activeId.value));
const visibleSessions = computed(() =>
	sessions.value
		.filter((session) => Boolean(session.archivedAt) === showArchived.value)
		.map((session) => ({
			...session,
			stats: session.status.changes.reduce(
				(sum, change) => ({
					additions: sum.additions + change.additions,
					deletions: sum.deletions + change.deletions,
				}),
				{ additions: 0, deletions: 0 },
			),
		})),
);
const archivedCount = computed(() => sessions.value.filter((session) => session.archivedAt).length);
const otherPreview = computed(() =>
	sessions.value.find(
		(session) =>
			session.id !== activeId.value && ['starting', 'running'].includes(session.status.app),
	),
);
const repositoryName = computed(() =>
	props.config.repositoryUrl
		.replace(/\.git$/, '')
		.split('/')
		.slice(-2)
		.join('/'),
);
const repositoryLabel = computed(() => repositoryName.value.split('/').pop());
let disposed = false;
let refreshing = false;
let selectedOnce = false;

function select(session: AgentCodingSessionSummary, chatId?: string) {
	const requestedId = chatId ?? activeChatIds.value[session.id];
	const chat = session.chats.find((item) => item.id === requestedId) ?? session.chats.at(-1);
	if (!chat) return;
	mobileSidebar.value = false;
	if (selectedOnce && activeId.value === session.id && activeChatIds.value[session.id] === chat.id)
		return;
	activeId.value = session.id;
	activeChatIds.value[session.id] = chat.id;
	selectedOnce = true;
	emit('session-select', chat);
}

function selectChat(id: string) {
	if (selected.value) select(selected.value, id);
}

async function createChat() {
	const worktree = selected.value;
	if (
		!props.canExecute ||
		creatingChat.value ||
		!worktree ||
		worktree.archivedAt ||
		worktree.status.phase !== 'ready'
	)
		return;
	const previousChatId = activeChatIds.value[worktree.id];
	creatingChat.value = true;
	error.value = '';
	try {
		const chat = await api.value.createChat(worktree.id);
		if (disposed) return;
		const current = sessions.value.find((session) => session.id === worktree.id);
		if (!current) return;
		if (!current.chats.some((item) => item.id === chat.id)) current.chats.push(chat);
		if (activeId.value === worktree.id && activeChatIds.value[worktree.id] === previousChatId)
			select(current, chat.id);
	} catch (cause) {
		if (!disposed) error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		creatingChat.value = false;
	}
}

function activity(session: AgentCodingSessionSummary) {
	if (session.archivedAt) return i18n.baseText('agents.coding.sessions.archived');
	if (session.activity === 'running') return i18n.baseText('agents.coding.sessions.working');
	if (session.activity === 'waiting') return i18n.baseText('agents.coding.sessions.waiting');
	if (session.status.phase === 'error' || session.activity === 'error')
		return i18n.baseText('agents.coding.sessions.failed');
	if (session.status.phase !== 'ready') return i18n.baseText('agents.coding.sessions.preparing');
	if (session.activity === 'completed') return i18n.baseText('agents.coding.sessions.completed');
	return i18n.baseText('agents.coding.status.ready');
}

function sessionBusy(session: AgentCodingSessionSummary) {
	return (
		session.activity === 'running' ||
		session.status.check === 'running' ||
		['cloning', 'installing'].includes(session.status.phase)
	);
}

function sessionIcon(session: AgentCodingSessionSummary) {
	if (session.archivedAt) return 'archive';
	if (sessionBusy(session)) return 'spinner';
	if (session.status.phase === 'error' || session.activity === 'error') return 'circle-alert';
	if (session.activity === 'waiting') return 'message-circle';
	if (session.activity === 'completed') return 'circle-check';
	return 'git-branch';
}

async function refresh() {
	if (refreshing || disposed) return;
	refreshing = true;
	try {
		let [result, status] = await Promise.all([api.value.sessions(), api.value.status()]);
		if (disposed) return;
		baseStatus.value = status;
		if (!result.sessions.length && status.phase === 'ready' && props.canExecute) {
			await api.value.createSession({
				id: props.sessionId,
				name: i18n.baseText('agents.coding.sessions.original'),
				baseBranch: '',
				branch: '',
				original: true,
			});
			result = await api.value.sessions();
		}
		if (disposed) return;
		sessions.value = result.sessions;
		branches.value = result.branches;
		const requested = !selectedOnce
			? sessions.value.find((session) => session.chats.some((chat) => chat.id === props.sessionId))
			: undefined;
		const current =
			requested ??
			selected.value ??
			sessions.value.find((session) => !session.archivedAt) ??
			sessions.value[0];
		if (current && (!selectedOnce || current.id !== activeId.value))
			select(current, requested ? props.sessionId : undefined);
		error.value = '';
	} catch (cause) {
		if (!disposed) error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		refreshing = false;
		loading.value = false;
	}
}

function openNewSession() {
	name.value = '';
	branch.value = '';
	baseBranch.value = props.config.branch || baseStatus.value?.branch || 'HEAD';
	createError.value = '';
	dialog.value = true;
}

async function createSession() {
	if (!props.canExecute || busy.value) return;
	if (!name.value.trim()) {
		createError.value = i18n.baseText('agents.coding.sessions.nameRequired');
		return;
	}
	busy.value = true;
	createError.value = '';
	try {
		const created = await api.value.createSession({
			name: name.value.trim(),
			branch: branch.value.trim(),
			baseBranch: baseBranch.value.trim(),
			original: false,
		});
		const result = await api.value.sessions();
		if (disposed) return;
		sessions.value = result.sessions;
		branches.value = result.branches;
		const session = sessions.value.find((item) => item.id === created.id);
		if (session) select(session);
		showArchived.value = false;
		dialog.value = false;
	} catch (cause) {
		createError.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		busy.value = false;
	}
}

async function archive(session: AgentCodingSessionSummary) {
	if (!props.canExecute || busy.value || sessionBusy(session)) return;
	busy.value = true;
	try {
		await api.value.archiveSession(session.id, !session.archivedAt);
		await refresh();
		if (session.id === activeId.value && !session.archivedAt) {
			const next = sessions.value.find((item) => !item.archivedAt);
			if (next) select(next);
		}
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		busy.value = false;
	}
}

function toggleSidebar() {
	if (narrow.value) mobileSidebar.value = !mobileSidebar.value;
	else sidebarOpen.value = !sidebarOpen.value;
}

watch(
	() => props.sessionId,
	(id) => {
		if (!id || id === activeChatIds.value[activeId.value]) return;
		const session = sessions.value.find((item) => item.chats.some((chat) => chat.id === id));
		if (session) select(session, id);
	},
);
useIntervalFn(refresh, 5 * TIME.SECOND);
onMounted(refresh);
onBeforeUnmount(() => {
	disposed = true;
});
defineExpose({ openNewSession });
</script>

<template>
	<div :class="$style.coding" data-testid="agent-coding-view">
		<header :class="$style.header">
			<N8nTooltip :content="i18n.baseText('agents.coding.back')" as-child>
				<N8nIconButton
					icon="arrow-left"
					variant="ghost"
					size="xsmall"
					:aria-label="i18n.baseText('agents.coding.back')"
					@click="emit('back')"
				/>
			</N8nTooltip>
			<N8nTooltip :content="i18n.baseText('agents.coding.sessions.toggle')" as-child>
				<N8nIconButton
					icon="panel-left"
					variant="ghost"
					size="xsmall"
					:aria-label="i18n.baseText('agents.coding.sessions.toggle')"
					:aria-expanded="sidebarShown"
					@click="toggleSidebar"
				/>
			</N8nTooltip>
			<div :class="$style.identity">
				<span :class="$style.repositoryName" :title="repositoryName">{{ repositoryLabel }}</span>
				<N8nIcon v-if="selected" icon="chevron-right" size="small" :class="$style.separator" />
				<span
					v-if="selected"
					:class="$style.sessionTitle"
					:title="selected.status.branch || selected.branch"
					>{{ selected.name }}</span
				>
			</div>
			<N8nTooltip :content="i18n.baseText('agents.coding.settings')" as-child>
				<N8nIconButton
					icon="settings"
					variant="ghost"
					size="xsmall"
					:aria-label="i18n.baseText('agents.coding.settings')"
					@click="emit('back')"
				/>
			</N8nTooltip>
		</header>
		<div v-if="error" :class="$style.error" role="alert">{{ error }}</div>
		<div :class="$style.body">
			<aside
				v-show="sidebarShown"
				:class="[$style.sidebar, { [$style.mobileSidebar]: narrow }]"
				:aria-label="i18n.baseText('agents.coding.sessions.title')"
			>
				<div :class="$style.sidebarHeader">
					<N8nIcon icon="folder" size="small" />
					<span :class="$style.repositoryLabel" :title="repositoryName">{{ repositoryLabel }}</span>
					<N8nTooltip :content="i18n.baseText('agents.coding.sessions.new')" as-child>
						<N8nIconButton
							variant="ghost"
							size="xsmall"
							icon="plus"
							:disabled="!canExecute || busy || baseStatus?.phase !== 'ready'"
							:aria-label="i18n.baseText('agents.coding.sessions.new')"
							data-testid="coding-new-session"
							@click="openNewSession"
						/>
					</N8nTooltip>
				</div>
				<div :class="$style.sessionList">
					<div
						v-for="session in visibleSessions"
						:key="session.id"
						:class="[$style.sessionRow, { [$style.selected]: session.id === activeId }]"
					>
						<button
							type="button"
							:class="$style.session"
							:aria-current="session.id === activeId ? 'true' : undefined"
							:aria-label="`${session.name}, ${session.status.branch || session.branch}, ${activity(session)}`"
							:title="`${session.name}\n${session.status.branch || session.branch}\n${activity(session)}`"
							:data-testid="`coding-session-${session.id}`"
							@click="select(session)"
						>
							<span
								:class="$style.sessionStatus"
								:data-activity="session.activity"
								:data-phase="session.status.phase"
								aria-hidden="true"
							>
								<N8nIcon :icon="sessionIcon(session)" size="small" :spin="sessionBusy(session)" />
							</span>
							<span :class="$style.sessionName">{{ session.name }}</span>
							<span :class="$style.sessionStats">
								<span v-if="session.stats.additions" :class="$style.additions"
									>+{{ abbreviateNumber(session.stats.additions) }}</span
								>
								<span v-if="session.stats.deletions" :class="$style.deletions"
									>−{{ abbreviateNumber(session.stats.deletions) }}</span
								>
							</span>
						</button>
						<N8nTooltip
							:content="
								i18n.baseText(
									session.archivedAt
										? 'agents.coding.sessions.reopen'
										: 'agents.coding.sessions.archive',
								)
							"
							as-child
						>
							<N8nIconButton
								:icon="session.archivedAt ? 'archive-restore' : 'archive'"
								variant="ghost"
								size="xsmall"
								:class="$style.archive"
								:disabled="!canExecute || busy || sessionBusy(session)"
								:aria-label="
									i18n.baseText(
										session.archivedAt
											? 'agents.coding.sessions.reopen'
											: 'agents.coding.sessions.archive',
									)
								"
								@click="archive(session)"
							/>
						</N8nTooltip>
					</div>
					<N8nText
						v-if="!visibleSessions.length"
						size="small"
						color="text-light"
						:class="$style.empty"
						>{{
							i18n.baseText(
								loading ? 'agents.coding.sessions.loading' : 'agents.coding.sessions.empty',
							)
						}}</N8nText
					>
				</div>
				<N8nButton
					variant="ghost"
					size="xsmall"
					icon="archive"
					:class="$style.archiveToggle"
					:aria-pressed="showArchived"
					:aria-label="
						i18n.baseText(
							showArchived
								? 'agents.coding.sessions.showActive'
								: 'agents.coding.sessions.showArchived',
						)
					"
					@click="showArchived = !showArchived"
					>{{
						i18n.baseText(
							showArchived
								? 'agents.coding.sessions.showActive'
								: 'agents.coding.sessions.archived',
						)
					}}<span v-if="!showArchived && archivedCount" :class="$style.archivedCount">{{
						archivedCount
					}}</span></N8nButton
				>
			</aside>
			<AgentCodingWorkspace
				v-show="!narrow || !mobileSidebar"
				:key="selected?.id ?? 'repository'"
				:class="$style.workspace"
				:project-id="projectId"
				:agent-id="agentId"
				:config="config"
				:can-execute="canExecute"
				:session="selected"
				:chat-id="activeChatIds[activeId]"
				:creating-chat="creatingChat"
				:other-preview="otherPreview?.name"
				:streaming="streaming"
				:send-review="sendReview"
				@add-to-chat="emit('add-to-chat', $event)"
				@new-chat="createChat"
				@chat-select="selectChat"
				@changed="refresh"
				@reopen="selected && archive(selected)"
			>
				<slot v-if="selected && !selected.archivedAt && selected.status.phase === 'ready'" />
				<div v-else :class="$style.chatPlaceholder">
					<N8nIcon
						:icon="selected && sessionBusy(selected) ? 'spinner' : 'git-branch'"
						:spin="Boolean(selected && sessionBusy(selected))"
						size="large"
					/><N8nText size="small" color="text-light">{{
						i18n.baseText(
							selected?.archivedAt
								? 'agents.coding.sessions.archivedHint'
								: 'agents.coding.sessions.prepareHint',
						)
					}}</N8nText>
				</div>
			</AgentCodingWorkspace>
		</div>
		<AgentModal
			v-model:open="dialog"
			:title="i18n.baseText('agents.coding.sessions.new')"
			:busy="busy"
			size="medium"
		>
			<div :class="$style.form">
				<N8nInputLabel
					:label="i18n.baseText('agents.coding.sessions.name')"
					input-name="coding-session-name"
					><N8nInput
						id="coding-session-name"
						v-model="name"
						:maxlength="100"
						:placeholder="i18n.baseText('agents.coding.sessions.namePlaceholder')"
						@keydown.enter="createSession"
				/></N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('agents.coding.sessions.base')"
					input-name="coding-session-base"
					><N8nSelect
						id="coding-session-base"
						v-model="baseBranch"
						filterable
						allow-create
						default-first-option
						:teleported="false"
						><N8nOption
							v-for="item in branches"
							:key="item"
							:label="item"
							:value="item" /></N8nSelect
				></N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('agents.coding.sessions.branch')"
					input-name="coding-session-branch"
					><N8nInput
						id="coding-session-branch"
						v-model="branch"
						:maxlength="255"
						:placeholder="i18n.baseText('agents.coding.sessions.branchPlaceholder')"
				/></N8nInputLabel>
				<N8nText size="small" color="text-light">{{
					i18n.baseText('agents.coding.sessions.createHint')
				}}</N8nText>
				<div v-if="createError" :class="$style.error" role="alert">{{ createError }}</div>
			</div>
			<template #footerActions
				><N8nButton :loading="busy" :disabled="busy" @click="createSession">{{
					i18n.baseText('agents.coding.sessions.create')
				}}</N8nButton></template
			>
		</AgentModal>
	</div>
</template>

<style lang="scss" module>
.coding {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
	background: var(--background--surface);
}
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-bottom: var(--border);
	min-height: var(--height--xl);
	flex-shrink: 0;
}
.identity {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--xs);
}
.repositoryName,
.repositoryLabel,
.sessionTitle {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
.repositoryName {
	color: var(--text-color--subtler);
	max-width: var(--spacing--5xl);
}
.separator {
	color: var(--text-color--subtler);
	flex-shrink: 0;
}
.sessionTitle {
	font-weight: var(--font-weight--medium);
}
.body {
	display: flex;
	flex: 1;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}
.sidebar {
	display: flex;
	flex-direction: column;
	width: calc(var(--spacing--5xl) - var(--spacing--sm));
	flex-shrink: 0;
	border-right: var(--border);
	padding: var(--spacing--2xs);
	gap: var(--spacing--4xs);
	background: var(--background--subtle);
}
.sidebarHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--lg);
	padding-inline: var(--spacing--2xs) var(--spacing--4xs);
	color: var(--text-color--subtler);
}
.repositoryLabel {
	flex: 1;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
}
.sessionList {
	flex: 1;
	min-height: 0;
	overflow: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}
.sessionRow {
	position: relative;
	display: flex;
	flex-shrink: 0;
	border-radius: var(--radius--2xs);
}
.sessionRow:hover {
	background: var(--background--hover);
}
.sessionRow.selected {
	background: var(--background--active);
}
.selected .sessionName {
	font-weight: var(--font-weight--medium);
}
.session {
	border: 0;
	border-radius: inherit;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	text-align: left;
	min-width: 0;
	min-height: var(--height--lg);
	flex: 1;
	background: transparent;
	color: var(--text-color);
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.session:focus-visible {
	outline: var(--focus--border-width) solid var(--focus--border-color);
	outline-offset: calc(-1 * var(--focus--border-width));
}
.sessionName {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--regular);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.sessionStatus {
	display: flex;
	align-items: center;
	color: var(--text-color--subtler);
	flex-shrink: 0;
}
.sessionStatus[data-activity='running'] {
	color: var(--text-color--info);
}
.sessionStatus[data-activity='waiting'] {
	color: var(--text-color--warning);
}
.sessionStatus[data-activity='error'],
.sessionStatus[data-phase='error'] {
	color: var(--text-color--danger);
}
.sessionStats {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
	min-width: var(--height--xs);
	flex-shrink: 0;
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;
}
.additions {
	color: light-dark(var(--color--green-800), var(--diff--color--new));
}
.deletions {
	color: light-dark(var(--color--red-800), var(--diff--color--deleted));
}
.archive {
	position: absolute;
	right: var(--spacing--4xs);
	top: 50%;
	transform: translateY(-50%);
	opacity: 0;
	pointer-events: none;
}
.sessionRow:hover .archive,
.sessionRow:focus-within .archive {
	opacity: 1;
	pointer-events: auto;
}
.sessionRow:hover .sessionStats,
.sessionRow:focus-within .sessionStats {
	visibility: hidden;
}
.archiveToggle {
	align-self: flex-start;
	color: var(--text-color--subtler);
	margin-top: var(--spacing--2xs);
}
.archivedCount {
	font-variant-numeric: tabular-nums;
}
.workspace {
	flex: 1;
	min-width: 0;
	min-height: 0;
}
.chatPlaceholder {
	display: flex;
	flex: 1;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	text-align: center;
	padding: var(--spacing--lg);
	gap: var(--spacing--sm);
}
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.error {
	padding: var(--spacing--xs);
	color: var(--text-color--danger);
	font-size: var(--font-size--sm);
	overflow-wrap: anywhere;
}
.empty {
	padding: var(--spacing--sm) var(--spacing--2xs);
}
.mobileSidebar {
	width: 100%;
	border-right: 0;
}
@media (max-width: 48rem) {
	.header {
		gap: var(--spacing--3xs);
		padding-inline: var(--spacing--2xs);
	}
	.repositoryName {
		max-width: var(--spacing--4xl);
	}
}
@media (hover: none) {
	.archive {
		opacity: 1;
		pointer-events: auto;
	}
	.session {
		padding-right: var(--spacing--xl);
	}
	.sessionStats {
		min-width: 0;
	}
}
</style>
