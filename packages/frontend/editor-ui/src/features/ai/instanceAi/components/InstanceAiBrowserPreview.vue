<script lang="ts" setup>
/**
 * The live view of a running cloud browser task, in a preview tab. It is view-only until the user
 * clicks "Take over". When the agent asked for the user, that only makes the live view usable.
 * Otherwise it also tells the server, and the agent pauses at its next call. Either way, "I'm done"
 * answers the agent's pause and returns control. The frame around the live view is ours: the live
 * view is embedded without Browserbase's own bar.
 */
import { N8nButton, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, inject, ref, watch } from 'vue';

import {
	CloudBrowserLiveViewsKey,
	embeddedLiveViewUrl,
	liveViewKey,
} from '../composables/useCloudBrowserLiveViews';
import { postCloudBrowserTakeOver } from '../instanceAi.api';
import { useThread } from '../instanceAi.store';
import type { BrowserTab } from '../useCanvasPreview';

const props = defineProps<{ tab: BrowserTab }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const thread = useThread();
const liveViews = inject(CloudBrowserLiveViewsKey, undefined);

const liveView = computed(() => liveViews?.get(props.tab.taskId));
const liveViewUrl = computed(() => liveView.value?.liveViewUrl);
const frameUrl = computed(() => (liveViewUrl.value ? embeddedLiveViewUrl(liveViewUrl.value) : ''));
const reloadKey = ref(0);
// A link signed again for the same tab keeps the frame. Another tab, or Reload, reloads it.
const frameKey = computed(
	() => `${liveViewUrl.value ? liveViewKey(liveViewUrl.value) : ''}:${reloadKey.value}`,
);

/** True after the user clicks "Take over", until they return control. */
const hasControl = ref(false);
const isTakingOver = ref(false);
const isReturningControl = ref(false);
/** After a takeover the agent did not ask for, "I'm done" first asks what the user changed. */
const isNoteDialogOpen = ref(false);
const note = ref('');
const userAction = computed(() => props.tab.userAction);
/** The user took over, and the agent has not paused yet, so "I'm done" has nothing to answer. */
const isPausingAgent = computed(() => hasControl.value && !userAction.value);
const isUserTakeover = computed(() => isPausingAgent.value || !!userAction.value?.userTookOver);
/** "Take over" shows on hover only, unless the agent asked for the user. */
const isAgentAsking = computed(() => !!userAction.value && !userAction.value.userTookOver);

// Control ends when the agent's pause is answered, here or in another tab.
watch(
	() => userAction.value?.requestId,
	(requestId, previousRequestId) => {
		if (requestId || !previousRequestId) return;
		hasControl.value = false;
		isReturningControl.value = false;
		isNoteDialogOpen.value = false;
		note.value = '';
	},
);

/** The address bar shows the host and path, like a browser does. */
const address = computed(() => {
	const pageUrl = liveView.value?.pageUrl;
	if (!pageUrl) return '';
	try {
		const url = new URL(pageUrl);
		return `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
	} catch {
		return pageUrl;
	}
});
const isSecure = computed(() => liveView.value?.pageUrl?.startsWith('https://') ?? false);

const placeholder = computed(() => {
	const status = liveView.value?.status;
	if (status === 'ended') return i18n.baseText('instanceAi.cloudBrowser.ended');
	return i18n.baseText('instanceAi.cloudBrowser.opening');
});

async function takeOver() {
	// The agent already paused for the user, so the server knows they are in control.
	if (userAction.value) {
		hasControl.value = true;
		return;
	}
	if (isTakingOver.value) return;
	isTakingOver.value = true;
	try {
		await postCloudBrowserTakeOver(rootStore.restApiContext, thread.id, props.tab.taskId);
		hasControl.value = true;
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.cloudBrowser.takeOverFailed'));
	} finally {
		isTakingOver.value = false;
	}
}

function onDone() {
	if (userAction.value?.userTookOver) {
		isNoteDialogOpen.value = true;
		return;
	}
	void returnControl();
}

async function returnControl(userInput?: string) {
	const requestId = userAction.value?.requestId;
	if (!requestId || isReturningControl.value) return;
	isReturningControl.value = true;
	const sent = await thread.confirmAction(requestId, {
		kind: 'browserReturnControl',
		...(userInput ? { userInput } : {}),
	});
	if (sent) thread.resolveConfirmation(requestId, 'approved');
	else isReturningControl.value = false;
}
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-browser-preview">
		<div
			v-if="userAction || hasControl"
			:class="$style.banner"
			data-test-id="instance-ai-browser-preview-user-action"
		>
			<div :class="$style.bannerText">
				<N8nText tag="div" size="medium" bold :class="$style.bannerTitle">
					{{
						isUserTakeover
							? i18n.baseText('instanceAi.cloudBrowser.youHaveControl')
							: i18n.baseText('instanceAi.cloudBrowser.needsInput')
					}}
				</N8nText>
				<N8nText tag="div" size="medium">
					{{
						isPausingAgent
							? i18n.baseText('instanceAi.cloudBrowser.pausingAgent')
							: isUserTakeover
								? i18n.baseText('instanceAi.cloudBrowser.returnControlHint')
								: userAction?.reason
					}}
				</N8nText>
			</div>
			<N8nButton
				:variant="hasControl ? 'brand' : 'outline'"
				size="medium"
				:disabled="!userAction"
				:loading="isReturningControl"
				data-test-id="instance-ai-browser-preview-done"
				@click="onDone"
			>
				{{ i18n.baseText('instanceAi.cloudBrowser.done') }}
			</N8nButton>
		</div>
		<div :class="$style.stage">
			<div :class="$style.window">
				<div :class="$style.toolbar">
					<N8nIcon icon="arrow-left" size="small" :class="$style.toolbarIcon" />
					<N8nIcon icon="arrow-right" size="small" :class="$style.toolbarIcon" />
					<div :class="$style.addressBar" data-test-id="instance-ai-browser-preview-address">
						<N8nIcon v-if="isSecure" icon="lock" size="xsmall" :class="$style.toolbarIcon" />
						<span :class="$style.address" :title="liveView?.pageUrl">{{ address }}</span>
					</div>
					<button
						type="button"
						:class="$style.toolbarButton"
						:title="i18n.baseText('instanceAi.cloudBrowser.reload')"
						:aria-label="i18n.baseText('instanceAi.cloudBrowser.reload')"
						@click="reloadKey++"
					>
						<N8nIcon icon="refresh-cw" size="small" />
					</button>
					<a
						v-if="liveViewUrl"
						:href="liveViewUrl"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.toolbarButton"
						:title="i18n.baseText('instanceAi.cloudBrowser.openInNewWindow')"
						:aria-label="i18n.baseText('instanceAi.cloudBrowser.openInNewWindow')"
					>
						<N8nIcon icon="external-link" size="small" />
					</a>
				</div>
				<div :class="$style.frameBox">
					<div
						v-if="!frameUrl"
						:class="$style.placeholder"
						data-test-id="instance-ai-browser-preview-placeholder"
					>
						{{ placeholder }}
					</div>
					<iframe
						v-else
						:key="frameKey"
						:src="frameUrl"
						:title="i18n.baseText('instanceAi.cloudBrowser.frameTitle')"
						:class="[$style.frame, { [$style.viewOnly]: !hasControl }]"
						:tabindex="hasControl ? 0 : -1"
						sandbox="allow-same-origin allow-scripts allow-forms"
						allow="clipboard-read; clipboard-write"
						data-test-id="instance-ai-browser-preview-frame"
					/>
					<div
						v-if="frameUrl && !hasControl"
						:class="[$style.overlay, { [$style.overlayVisible]: isAgentAsking }]"
						data-test-id="instance-ai-browser-preview-overlay"
					>
						<N8nButton
							variant="brand"
							size="large"
							data-test-id="instance-ai-browser-preview-take-over"
							:loading="isTakingOver"
							@click="takeOver"
						>
							{{ i18n.baseText('instanceAi.cloudBrowser.takeOver') }}
						</N8nButton>
					</div>
					<div
						v-if="isNoteDialogOpen"
						:class="$style.noteBackdrop"
						data-test-id="instance-ai-browser-preview-note-dialog"
					>
						<div
							:class="$style.noteDialog"
							role="dialog"
							aria-modal="true"
							aria-labelledby="instance-ai-browser-note-title"
						>
							<N8nText id="instance-ai-browser-note-title" tag="h3" size="large" bold>
								{{ i18n.baseText('instanceAi.cloudBrowser.noteTitle') }}
							</N8nText>
							<N8nText tag="p" size="small" :class="$style.noteDescription">
								{{ i18n.baseText('instanceAi.cloudBrowser.noteDescription') }}
							</N8nText>
							<N8nInput
								v-model="note"
								type="textarea"
								:autosize="{ minRows: 3, maxRows: 8 }"
								:maxlength="2000"
								:placeholder="i18n.baseText('instanceAi.cloudBrowser.notePlaceholder')"
								data-test-id="instance-ai-browser-preview-note-input"
							/>
							<div :class="$style.noteActions">
								<N8nButton
									variant="outline"
									size="medium"
									:disabled="isReturningControl"
									data-test-id="instance-ai-browser-preview-note-skip"
									@click="returnControl()"
								>
									{{ i18n.baseText('instanceAi.cloudBrowser.noteSkip') }}
								</N8nButton>
								<N8nButton
									variant="brand"
									size="medium"
									:disabled="!note.trim()"
									:loading="isReturningControl"
									data-test-id="instance-ai-browser-preview-note-submit"
									@click="returnControl(note.trim())"
								>
									{{ i18n.baseText('instanceAi.cloudBrowser.noteSubmit') }}
								</N8nButton>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	height: 100%;
	padding: var(--spacing--sm);
	background: var(--color--background);
}

// Lets the window size itself against the space it has, in both directions.
.stage {
	flex: 1;
	min-height: 0;
	display: flex;
	justify-content: center;
	align-items: flex-start;
	container-type: size;
}

.banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.bannerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.bannerTitle {
	color: var(--color--warning--shade-1);
}

.window {
	// The toolbar plus a frame in the browser window's shape (1280x800, set on the session), as
	// large as fits. A frame of another shape would letterbox the live view and shrink it more.
	--toolbar-height: 36px;
	--browser-aspect: 16 / 10;
	width: min(100cqw, calc((100cqh - var(--toolbar-height)) * (var(--browser-aspect))));
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--xs);
}

.toolbar {
	height: var(--toolbar-height);
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
}

.toolbarIcon {
	color: var(--color--text--tint-1);
}

.addressBar {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.address {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.toolbarButton {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--4xs);
	border: 0;
	background: none;
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover {
		color: var(--color--text);
	}
}

.frameBox {
	position: relative;
	aspect-ratio: var(--browser-aspect);
	width: 100%;
}

.placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background: var(--color--background--light-2);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.frame {
	display: block;
	width: 100%;
	height: 100%;
	border: 0;
	background: var(--color--background--light-3);
}

.viewOnly {
	// Browserbase's way to make a live view read-only: block mouse and keyboard input.
	pointer-events: none;
}

.overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--black-alpha-400);
	opacity: 0;
	transition: opacity 0.15s ease;

	.frameBox:hover &,
	&:focus-within,
	&.overlayVisible {
		opacity: 1;
	}
}
.noteBackdrop {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
	background: var(--color--black-alpha-400);
}

.noteDialog {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
	max-width: calc(var(--spacing--5xl) * 2);
	padding: var(--spacing--lg);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--md);
}

.noteDescription {
	color: var(--color--text--tint-1);
}

.noteActions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
