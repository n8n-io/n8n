<script lang="ts" setup>
/**
 * Generic embeddable n8n Assistant panel: a chat scoped to one subject (an
 * agent today, a workflow later — see `InstanceAiEmbedSubject`), with its own
 * filtered thread history. It never renders artifact/preview panels — the
 * host's own surface (the agent builder, a future node editor) is the
 * artifact; "open in n8n Assistant" is the escape hatch to the full UI.
 *
 * Router-free except for that one hand-off. Provides the thread runtime
 * itself, so `InstanceAiConversation` works unchanged. Its history lives in
 * `InstanceAiViewHeader`'s popover — scoped and non-navigating via `threadList` —
 * rather than a sidebar.
 */
import {
	computed,
	defineComponent,
	h,
	nextTick,
	onBeforeUnmount,
	onMounted,
	onUnmounted,
	provide,
	ref,
	watch,
} from 'vue';
import { useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import type {
	InstanceAiHandoffContext,
	InstanceAiPrefillPayload,
	InstanceAiThreadSummary,
	SystemAgentThreadSummary,
} from '@n8n/api-types';
import { N8nIconButton, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	getSystemAgentThread,
	listSystemAgentThreads,
} from '@/features/agents/composables/useAgentApi';
import { INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY, INSTANCE_AI_THREAD_VIEW } from '../constants';
import { getThreadDisplayTitle } from '../instanceAi.threadRuntime';
import { provideThread, useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import {
	ASSISTANT_AGENT_ID,
	isKnownAssistantAgentThread,
	knownAssistantThreadRuntime,
	lookUpAssistantThreadRuntime,
	rememberAssistantAgentThread,
} from '../assistantAgent/assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgent/assistantAgentThreads.store';
import AssistantAgentPanelThread from './AssistantAgentPanelThread.vue';
import { useAgentMutationRefresh } from '../composables/useAgentMutationRefresh';
import { useBuildingArtifactIds } from '../composables/useBuildingArtifactIds';
import { useIsAgentWorking } from '../composables/useIsAgentWorking';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import {
	provisionSubjectThread,
	stashPendingComposerDraft,
	stashPendingHandoffContext,
	type InstanceAiThreadLaunch,
	type PendingComposerDraft,
} from '../composables/useInstanceAiHandoff';
import InstanceAiViewHeader from '../components/InstanceAiViewHeader.vue';
import InstanceAiConversation from '../components/InstanceAiConversation.vue';
import type { SuggestionSelectionPayload } from '../components/InstanceAiInput.vue';
import { useInstanceAiEmbedThreads } from './useInstanceAiEmbedThreads';
import {
	INSTANCE_AI_EMBED_SUBJECT_KEY,
	threadTargetsSubject,
	type InstanceAiEmbedSubject,
} from './instanceAiEmbed.types';

const props = withDefaults(
	defineProps<{
		subject: InstanceAiEmbedSubject;
		launch: InstanceAiThreadLaunch;
		threadId?: string;
		visible?: boolean;
		closable?: boolean;
		showOpenFullAssistant?: boolean;
		placeholder?: string;
		composerHeight?: string;
		/** Runs before a new thread is minted (e.g. flush a pending autosave). */
		beforeNewThread?: () => Promise<void>;
		/** Runs before every message send (e.g. flush a pending autosave). */
		beforeSend?: () => Promise<void>;
	}>(),
	{ visible: true, closable: true, showOpenFullAssistant: true },
);

const emit = defineEmits<{
	'update:threadId': [threadId: string];
	'update:building': [building: boolean];
	'update:working': [working: boolean];
	close: [];
	'message-sent': [];
}>();

const slots = defineSlots<{
	/** A host's welcome state, rendered by the conversation until the thread has its first message. */
	empty?: () => unknown;
	'composer-start'?: () => unknown;
	'composer-footer'?: () => unknown;
}>();

const i18n = useI18n();
const { isCtrlKeyPressed } = useDeviceSupport();
const toast = useToast();
const router = useRouter();
const store = useInstanceAiStore();
const rootStore = useRootStore();
const settingsStore = useInstanceAiSettingsStore();
const assistantAgentThreadsStore = useAssistantAgentThreadsStore();
const subject = computed(() => props.subject);
const { threads } = useInstanceAiEmbedThreads(subject);
provide(INSTANCE_AI_EMBED_SUBJECT_KEY, subject);

/** With the flag on, an agent panel starts its new threads on the Assistant agent. */
const usesAssistantAgent = computed(
	() => settingsStore.isAssistantAgentEnabled && props.subject.type === 'agent',
);
/**
 * The Assistant agent threads that this panel created, and if each one is still
 * new. A new thread has no binding yet: the server writes it with the first message.
 */
const panelAgentThreads = new Map<string, boolean>();
const subjectAgentThreads = computed(() =>
	usesAssistantAgent.value
		? assistantAgentThreadsStore.knownThreads.filter((thread) =>
				threadTargetsSubject(thread.metadata, props.subject),
			)
		: [],
);
/** The newest thread of the subject on either runtime. */
function newestThreadId(): string | undefined {
	return [...threads.value, ...subjectAgentThreads.value].sort(
		(a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
	)[0]?.id;
}

/** Adds the subject's Assistant agent threads to the store, for the list and the resume. */
async function loadSubjectAgentThreads(): Promise<boolean> {
	try {
		// shortcut: filters the newest 100 threads in the browser; add a server-side agent filter when a user has more than that.
		const { data } = await listSystemAgentThreads(rootStore.restApiContext, ASSISTANT_AGENT_ID, {
			limit: 100,
		});
		for (const thread of data) {
			if (threadTargetsSubject(thread.metadata, props.subject)) {
				assistantAgentThreadsStore.addOpenedThread(thread);
			}
		}
		return true;
	} catch {
		return false;
	}
}

// No preview panel here: artifact cards and chips open their resource in a new
// tab, so the host page (and this conversation) stays put.
function openInNewTab(path: string): boolean {
	window.open(path, '_blank', 'noopener');
	return true;
}
provide('openWorkflowPreview', (id: string) => openInNewTab(`/workflow/${id}`));
provide('openAgentPreview', (id: string, projectId: string) =>
	openInNewTab(`/projects/${projectId}/agents/${id}`),
);
// Scopes the header's popover history to this panel's subject — a stable
// function reference so the list's `filter` prop doesn't re-run on every render.
function threadFilter(thread: InstanceAiThreadSummary | SystemAgentThreadSummary): boolean {
	return threadTargetsSubject(thread.metadata, props.subject);
}

/** The template ref onto the mounted `InstanceAiConversation` — wired through
 * `ThreadScope`'s render (it's created with `h()`, so the ref is passed as a
 * vnode prop rather than a template attribute), null while no thread is mounted. */
const conversationRef = ref<InstanceType<typeof InstanceAiConversation> | null>(null);
const agentThreadRef = ref<InstanceType<typeof AssistantAgentPanelThread> | null>(null);
/** The mounted chat on either runtime. Both expose the same calls. */
const activeChat = computed(() => conversationRef.value ?? agentThreadRef.value);
watch(
	() => props.visible,
	async (visible, wasVisible) => {
		if (!visible || wasVisible !== false) return;
		await nextTick();
		activeChat.value?.focus();
	},
	{ flush: 'post' },
);

/**
 * A hand-off requested before the conversation for the target thread exists
 * yet (still minting, or resuming). Flushed into the thread's stash the
 * moment its id is known, right before `update:threadId` is emitted — the
 * conversation picks the stash up itself on mount (`syncThread`).
 */
const queuedHandoff = ref<{
	context: InstanceAiHandoffContext;
	draft?: PendingComposerDraft;
} | null>(null);

function stashHandoff(
	threadId: string,
	queued: { context: InstanceAiHandoffContext; draft?: PendingComposerDraft },
) {
	stashPendingHandoffContext(threadId, queued.context);
	if (queued.draft) stashPendingComposerDraft(threadId, queued.draft);
	// An Assistant agent thread has no thread on the current runtime to write to.
	if (queued.context.source === 'agent-preview' && !isKnownAssistantAgentThread(threadId)) {
		const subjectIdAtQueue = props.subject.id;
		void store
			.updateThreadMetadata(threadId, {
				[INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY]: {
					agentId: queued.context.agentId,
					threadId: queued.context.threadId,
				},
			})
			.catch((error: unknown) => {
				// The panel may have unmounted or moved on to another subject while
				// the write was in flight — nothing left here for the toast to warn.
				if (!mounted || props.subject.id !== subjectIdAtQueue) return;
				toast.showError(error, i18n.baseText('generic.error'));
			});
	}
}

function flushQueuedHandoff(threadId: string) {
	const queued = queuedHandoff.value;
	if (!queued) return;
	queuedHandoff.value = null;
	stashHandoff(threadId, queued);
}

/** Every path that discovers a thread id routes through here so a queued
 * hand-off always lands before the host (and the conversation) see the id. */
function emitThreadId(threadId: string) {
	flushQueuedHandoff(threadId);
	emit('update:threadId', threadId);
}

/**
 * Puts a preview-chat hand-off into this panel: applies it directly when the
 * conversation is already mounted and clean, otherwise queues it for whichever
 * thread the panel is about to resume or mint. Mirrors
 * `InstanceAiThreadView`'s `handleAgentPreviewAssistantHandoff`.
 */
function handoff(context: InstanceAiHandoffContext, initialDraft?: PendingComposerDraft): boolean {
	const conversation = activeChat.value;
	if (conversation) {
		if (conversation.isDirty()) {
			toast.showMessage({
				title: i18n.baseText('instanceAi.input.finishDraftBeforeHandoff.title'),
				message: i18n.baseText('instanceAi.input.finishDraftBeforeHandoff.message'),
				type: 'warning',
			});
			return false;
		}
		conversation.applyHandoff(context, initialDraft);
		return true;
	}

	const queued = { context, draft: initialDraft };
	if (activeThreadId.value) {
		stashHandoff(activeThreadId.value, queued);
	} else {
		queuedHandoff.value = queued;
	}
	return true;
}

/**
 * Puts n8n-authored text into the mounted conversation's composer without
 * sending it. The host (e.g. the agent builder) owns the wording and the
 * pre-fill tag. A no-op while no thread is mounted yet.
 */
function setPrefill(prefill: InstanceAiPrefillPayload) {
	activeChat.value?.setPrefill(prefill);
}

/**
 * Sends a prompt to the assistant right away, without staging it in the
 * composer first. The host (e.g. the agent builder) owns the wording and the
 * pre-fill tag. A no-op while no thread is mounted yet.
 */
function submitSuggestion(payload: SuggestionSelectionPayload) {
	activeChat.value?.submitSuggestion(payload);
}

defineExpose({
	handoff,
	/** Forwards to the mounted conversation's composer; a no-op while no thread is mounted. */
	setPrefill,
	submitSuggestion,
});

/** The assistant is actively mutating the subject — the thread list stops
 * accepting select/new while that's true, so a click can't race it. */
const building = ref(false);
function onBuildingChange(value: boolean) {
	building.value = value;
	emit('update:building', value);
}

// A mint or resume in flight can outlive this component, or the subject it
// was minting for — both must be checked before the result is adopted.
let mounted = true;
onBeforeUnmount(() => {
	mounted = false;
});

/**
 * `openFullAssistant` hands this thread's runtime off to the full assistant
 * view, which adopts it via its own `provideThread` — disposing it here (on
 * unmount or on a thread change) would tear down a runtime the thread view is
 * about to reuse.
 */
let handedOffThreadId: string | undefined;

let minting = false;
async function mintThread() {
	if (minting) return;
	minting = true;
	const mintedForSubjectId = props.subject.id;
	const threadIdAtStart = props.threadId;
	try {
		try {
			await props.beforeNewThread?.();
		} catch {
			// The host's own flow (e.g. a failed autosave) already surfaced its
			// error — the hook owns its error UI, so just stop here.
			return;
		}
		if (usesAssistantAgent.value) {
			// The server creates the thread with its first message.
			if (
				!mounted ||
				props.subject.id !== mintedForSubjectId ||
				props.threadId !== threadIdAtStart
			) {
				return;
			}
			const threadId = uuidv4();
			rememberAssistantAgentThread(threadId, props.subject.projectId);
			panelAgentThreads.set(threadId, true);
			emitThreadId(threadId);
			return;
		}
		let threadId: string;
		try {
			threadId = await provisionSubjectThread(props.subject, props.launch);
		} catch (error) {
			// Leave the panel without a thread — the "+" in the list is the retry.
			toast.showError(error, i18n.baseText('instanceAi.handoff.openFailed.title'));
			return;
		}
		if (!mounted || props.subject.id !== mintedForSubjectId || props.threadId !== threadIdAtStart) {
			// Torn down, switched subjects, or the user picked a different thread
			// (row click / another mint) while this one was in flight — drop the
			// orphaned thread rather than adopt it under a stale selection.
			void store.deleteThread(threadId, { silent: true });
			return;
		}
		emitThreadId(threadId);
	} finally {
		minting = false;
	}
}

/** Resume the subject's most recent thread, or mint a fresh one. */
async function resumeOrMintThread() {
	if (props.subject.type === 'agent' && props.subject.pending) {
		// A freshly minted agent id can't already have threads — mint straight
		// away instead of waiting on the thread list round trip.
		void store.loadThreads();
		await mintThread();
		return;
	}
	const loaded = await Promise.all([
		store.loadThreads(),
		usesAssistantAgent.value ? loadSubjectAgentThreads() : true,
	]);
	if (!mounted) return;
	if (loaded.includes(false)) {
		// Leave the panel without a thread rather than mint a possibly-duplicate
		// one against a list we couldn't confirm — the "+" in the list is the retry.
		toast.showError(
			new Error(i18n.baseText('instanceAi.handoff.openFailed.message')),
			i18n.baseText('instanceAi.handoff.openFailed.title'),
		);
		return;
	}
	const existingId = newestThreadId();
	if (existingId) {
		emitThreadId(existingId);
	} else {
		await mintThread();
	}
}

/**
 * True once `threadId` (the current `props.threadId`) is confirmed to target
 * this subject, so `ThreadScope` never mounts a conversation for a thread the
 * host handed in that turns out to belong to someone else — see
 * `verifyThreadId`.
 */
const threadIdVerified = ref(!props.threadId);
const activeThreadId = computed(() => (threadIdVerified.value ? props.threadId : undefined));
/** The verified thread runs on the Assistant agent, not on the current runtime. */
const isAgentThread = ref(false);

/** Which runtime runs a thread, and the metadata that tells its subject. */
interface PanelThread {
	isAgentThread: boolean;
	metadata: Record<string, unknown> | undefined;
}

/** A thread that a store already holds, so it opens without a wait. */
function findThread(threadId: string): PanelThread | undefined {
	const metadata = store.getThreadMetadata(threadId);
	if (metadata !== undefined || store.threads.some((t) => t.id === threadId)) {
		return { isAgentThread: false, metadata };
	}
	const agentThread = usesAssistantAgent.value
		? assistantAgentThreadsStore.threadsById.get(threadId)
		: undefined;
	return agentThread ? { isAgentThread: true, metadata: agentThread.metadata } : undefined;
}

/** Fetches a thread that no store holds, from the runtime that runs it. */
async function fetchThread(threadId: string): Promise<PanelThread> {
	if (usesAssistantAgent.value) {
		const runtime =
			knownAssistantThreadRuntime(threadId, {
				assistantAgentEnabled: true,
				isAssistantThread: (id) => store.threads.some((thread) => thread.id === id),
			}) ??
			(await lookUpAssistantThreadRuntime(threadId, async (id) => {
				const thread = await getSystemAgentThread(rootStore.restApiContext, ASSISTANT_AGENT_ID, id);
				assistantAgentThreadsStore.addOpenedThread(thread);
				return thread;
			}));
		if (runtime.kind === 'assistant-agent') {
			await assistantAgentThreadsStore.loadThread(threadId);
			const metadata = assistantAgentThreadsStore.threadsById.get(threadId)?.metadata;
			return { isAgentThread: true, metadata };
		}
	}
	try {
		await store.loadThread(threadId);
	} catch {
		// Not found (or forbidden) — the caller treats it as a mismatch.
	}
	return { isAgentThread: false, metadata: store.getThreadMetadata(threadId) };
}

/**
 * Confirm an incoming `threadId` actually targets this subject before
 * `ThreadScope` is allowed to mount it: the host may hand in a stale
 * `?assistantThread=` (or similar) that now belongs to a different agent, or
 * to nothing at all. A thread already known locally is checked as-is;
 * otherwise it's fetched once. Anything that doesn't match is treated as
 * absent, same as no `threadId` at all.
 */
async function verifyThreadId(threadId: string): Promise<void> {
	threadIdVerified.value = false;
	if (panelAgentThreads.has(threadId)) {
		isAgentThread.value = true;
		threadIdVerified.value = true;
		return;
	}
	// A failed lookup falls through to the mismatch branch below.
	const thread = findThread(threadId) ?? (await fetchThread(threadId).catch(() => undefined));
	if (!mounted || props.threadId !== threadId) return; // superseded meanwhile
	if (thread && threadTargetsSubject(thread.metadata, props.subject)) {
		isAgentThread.value = thread.isAgentThread;
		threadIdVerified.value = true;
		return;
	}
	await resumeOrMintThread();
}

onMounted(() => {
	if (props.threadId) {
		void store.loadThreads();
		void verifyThreadId(props.threadId);
	} else {
		void resumeOrMintThread();
	}
});

watch(
	() => props.threadId,
	(next, previous) => {
		if (previous && previous !== next && previous !== handedOffThreadId) {
			store.disposeRuntime(previous);
		}
		// The host cleared the thread id (e.g. deleted elsewhere) — resume or mint,
		// same as the initial mount with no thread id.
		if (!next) {
			void resumeOrMintThread();
			return;
		}
		void verifyThreadId(next);
	},
);

onUnmounted(() => {
	// A host closing the panel mid-build must not stay locked forever.
	emit('update:building', false);
	emit('update:working', false);
	if (props.threadId && props.threadId !== handedOffThreadId) store.disposeRuntime(props.threadId);
});

function onAgentSessionCreated() {
	if (props.threadId) panelAgentThreads.set(props.threadId, false);
}

function onThreadSelect(threadId: string) {
	if (building.value) return;
	emit('update:threadId', threadId);
}

function onNewThreadRequested() {
	if (building.value) return;
	void mintThread();
}

function onThreadDeleted(wasActive: boolean) {
	if (!wasActive) return;
	const nextId = newestThreadId();
	if (nextId) {
		emit('update:threadId', nextId);
	} else {
		void mintThread();
	}
}

async function openFullAssistant() {
	const threadId = activeThreadId.value;
	if (!threadId) return;
	const subjectIdAtStart = props.subject.id;
	// The full view reads the same agent config, so flush pending edits first.
	try {
		await props.beforeSend?.();
	} catch {
		// The host already surfaced its own error — open the full view regardless.
	}
	if (!mounted || props.subject.id !== subjectIdAtStart || activeThreadId.value !== threadId) {
		// Torn down, switched subjects, or the selected thread moved on while
		// beforeSend was in flight — nothing left here to hand off.
		return;
	}
	handedOffThreadId = threadId;
	void router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
}

const currentThreadTitle = computed<string | undefined>(() => {
	const threadId = activeThreadId.value;
	if (!threadId) return undefined;
	if (isAgentThread.value) {
		return assistantAgentThreadsStore.threadsById.get(threadId)?.title ?? undefined;
	}
	const summary = store.threads.find((thread) => thread.id === threadId);
	const runtime = store.getRuntime(threadId);
	return getThreadDisplayTitle(summary, runtime?.messages ?? []);
});

/**
 * Owns the provide-boundary for the thread runtime: `provide()` only takes
 * effect for descendants created after it runs, so re-providing on a thread
 * switch needs a component that itself remounts (keyed by thread id) rather
 * than a plain watcher. Also the one place that can pass the runtime to
 * `useAgentMutationRefresh` / `useBuildingArtifactIds`, which need it handed
 * in by whichever scope provides it.
 */
const ThreadScope = defineComponent({
	name: 'InstanceAiChatPanelThreadScope',
	props: { threadId: { type: String, required: true } },
	emits: ['thread-missing', 'update:building'],
	setup(scopeProps, { emit: scopeEmit }) {
		const runtime = provideThread(scopeProps.threadId);
		const working = useIsAgentWorking(runtime);
		watch(working, (value) => emit('update:working', value), { immediate: true });
		useAgentMutationRefresh(runtime);
		const buildingArtifactIds = useBuildingArtifactIds(runtime);
		watch(
			() => buildingArtifactIds.value.has(props.subject.id),
			(value) => scopeEmit('update:building', value),
			{ immediate: true },
		);
		return () =>
			h(
				InstanceAiConversation,
				{
					// Closes over the outer scope's ref directly — `ThreadScope` is
					// defined inside the panel's own `<script setup>`, and this is the
					// only place that can reach the mounted conversation for `handoff()`.
					ref: conversationRef,
					// Forward the live subject so the chat-input context chip follows a
					// host rename instead of the snapshot stashed at thread mint.
					subject: props.subject,
					beforeSend: props.beforeSend,
					placeholder: props.placeholder,
					composerHeight: props.composerHeight,
					onMessageSent: () => emit('message-sent'),
					onThreadMissing: () => scopeEmit('thread-missing'),
				},
				{
					...(slots.empty ? { empty: slots.empty } : {}),
					...(slots['composer-start'] ? { 'composer-start': slots['composer-start'] } : {}),
					...(slots['composer-footer'] ? { 'composer-footer': slots['composer-footer'] } : {}),
				},
			);
	},
});

/** Handle shortcuts locally instead of useKeybindings because ChatInput has canvas paste protection. */
function handleCloseShortcut(event: KeyboardEvent) {
	if (props.closable === false) return;
	if (
		event.defaultPrevented ||
		event.isComposing ||
		event.shiftKey ||
		event.altKey ||
		(event.target instanceof Element && event.target.closest('[role="dialog"]'))
	) {
		return;
	}

	const isEscape = event.key === 'Escape' && !event.ctrlKey && !event.metaKey;
	const isToggleShortcut = event.key.toLowerCase() === 'j' && isCtrlKeyPressed(event);
	if (!isEscape && !isToggleShortcut) {
		return;
	}

	event.preventDefault();
	event.stopPropagation();
	emit('close');
}
</script>

<template>
	<div :class="$style.panel" data-test-id="instance-ai-embed-panel" @keydown="handleCloseShortcut">
		<InstanceAiViewHeader
			:title="currentThreadTitle"
			:thread-id="activeThreadId"
			:thread-list="{ filter: threadFilter, navigate: false, disabled: building }"
			@select="onThreadSelect"
			@deleted="onThreadDeleted"
		>
			<template #actions>
				<N8nTooltip
					:content="i18n.baseText('instanceAi.thread.new')"
					placement="bottom"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<N8nIconButton
						icon="message-circle-plus"
						variant="ghost"
						size="small"
						icon-size="large"
						:disabled="building"
						:aria-label="i18n.baseText('instanceAi.thread.new')"
						data-test-id="instance-ai-embed-new-thread"
						@click="onNewThreadRequested"
					/>
				</N8nTooltip>
				<N8nTooltip
					v-if="props.showOpenFullAssistant"
					:content="i18n.baseText('instanceAi.embed.openFullAssistant')"
					placement="bottom"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<N8nIconButton
						icon="external-link"
						variant="ghost"
						size="small"
						icon-size="large"
						:aria-label="i18n.baseText('instanceAi.embed.openFullAssistant')"
						data-test-id="instance-ai-embed-open-full"
						@click="openFullAssistant"
					/>
				</N8nTooltip>
				<KeyboardShortcutTooltip
					v-if="props.closable !== false"
					placement="bottom"
					:label="i18n.baseText('generic.close')"
					:shortcut="{ metaKey: false, shiftKey: false, keys: ['esc'] }"
				>
					<N8nIconButton
						icon="x"
						variant="ghost"
						size="small"
						icon-size="large"
						:aria-label="i18n.baseText('generic.close')"
						data-test-id="instance-ai-embed-close"
						@click="emit('close')"
					/>
				</KeyboardShortcutTooltip>
			</template>
		</InstanceAiViewHeader>
		<div :class="$style.body">
			<AssistantAgentPanelThread
				v-if="activeThreadId && isAgentThread && props.subject.type === 'agent'"
				ref="agentThreadRef"
				:key="activeThreadId"
				:thread-id="activeThreadId"
				:subject="props.subject"
				:new-session="panelAgentThreads.get(activeThreadId) === true"
				:placeholder="props.placeholder"
				:composer-height="props.composerHeight"
				:before-send="props.beforeSend"
				:class="$style.conversation"
				@update:building="onBuildingChange"
				@update:working="emit('update:working', $event)"
				@message-sent="emit('message-sent')"
				@session-created="onAgentSessionCreated"
			>
				<template v-if="slots.empty" #empty><slot name="empty" /></template>
				<template v-if="slots['composer-start']" #composer-start>
					<slot name="composer-start" />
				</template>
				<template v-if="slots['composer-footer']" #composer-footer>
					<slot name="composer-footer" />
				</template>
			</AssistantAgentPanelThread>
			<ThreadScope
				v-else-if="activeThreadId"
				:key="activeThreadId"
				:thread-id="activeThreadId"
				:class="$style.conversation"
				@thread-missing="mintThread"
				@update:building="onBuildingChange"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	// The host dock paints this surface; the conversation's input-dock fade
	// must end in the same colour or it shows as a band.
	--instance-ai-conversation-background: var(--background--surface);

	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	min-width: 0;
}

.body {
	display: flex;
	flex: 1;
	min-height: 0;
	min-width: 0;
}

.conversation {
	flex: 1;
	min-width: 0;
}
</style>
