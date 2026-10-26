<script lang="ts" setup>
/**
 * The live view of a running cloud browser task, in a preview tab. It keeps Browserbase's own
 * bar, which shows the address of the page. It is read-only until the user takes over. When the
 * agent asked for the user, the server already gave them control, so "Take over" only unlocks
 * the view. Otherwise it also tells the server, and the agent's calls wait. "I'm done" gives
 * control back. After a takeover the agent did not ask for, it first asks what the user changed.
 */
import { N8nButton, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { FocusScope } from 'reka-ui';
import { computed, inject, ref, watch } from 'vue';

import {
	CloudBrowserLiveViewsKey,
	embeddedLiveViewUrl,
} from '../composables/useCloudBrowserLiveViews';
import { postCloudBrowserReturnControl, postCloudBrowserTakeOver } from '../instanceAi.api';
import { useThread } from '../instanceAi.store';

const props = defineProps<{ taskId: string; userAction?: { reason: string } }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const thread = useThread();
const liveViews = inject(CloudBrowserLiveViewsKey, undefined);

const liveView = computed(() => liveViews?.get(props.taskId));

/**
 * One frame for each loaded window: the window behind the current one, kept loaded but hidden so
 * going back to it is instant, then the current window. Frames are keyed by window, so a window
 * that becomes current again keeps its frame. The window behind comes first, so no frame moves in
 * the page, which would reload it.
 */
const frames = computed(() => {
	const view = liveView.value;
	if (view?.status !== 'live') return [];
	const current = { windowId: view.windowId, liveViewUrl: view.liveViewUrl, isCurrent: true };
	return view.background ? [{ ...view.background, isCurrent: false }, current] : [current];
});

const isDisconnected = computed(
	() => liveView.value?.status === 'disconnected' || liveView.value?.status === 'not-found',
);
const placeholder = computed(() =>
	i18n.baseText(
		isDisconnected.value
			? 'instanceAi.cloudBrowser.disconnected'
			: 'instanceAi.cloudBrowser.opening',
	),
);

// The placeholder stays over the frames until the current window's frame has loaded. Loads
// are tracked by live view link, not by window: a new session can reuse a window id, and its
// frame loads the new link.
const loadedLiveViewUrls = ref(new Set<string>());
function onFrameLoad(liveViewUrl: string) {
	loadedLiveViewUrls.value.add(liveViewUrl);
}
// Only the frames on screen are tracked, so the set never holds a link that is gone.
watch(frames, (current) => {
	const shown = new Set(current.map((frame) => frame.liveViewUrl));
	for (const url of loadedLiveViewUrls.value) {
		if (!shown.has(url)) loadedLiveViewUrls.value.delete(url);
	}
});
const showsPlaceholder = computed(
	() =>
		!frames.value.some(
			(frame) => frame.isCurrent && loadedLiveViewUrls.value.has(frame.liveViewUrl),
		),
);

/** True after the user clicks "Take over", until they give control back. */
const hasControl = ref(false);
const isBusy = ref(false);
const isNoteDialogOpen = ref(false);
const note = ref('');
/** The user took over without the agent asking, so the agent does not know what they changed. */
const isUserTakeover = computed(() => hasControl.value && !props.userAction);

// After a reload, a takeover the user started is still in progress.
watch(
	() => liveView.value?.status === 'live' && liveView.value.userInControl === true,
	(inControl) => {
		if (inControl && !props.userAction) hasControl.value = true;
	},
	{ immediate: true },
);

// The browser closed, so there is nothing left to control.
watch(
	() => liveView.value?.status,
	(status) => {
		if (status === 'disconnected' || status === 'not-found') hasControl.value = false;
	},
);

// Control ended, so the question about what changed no longer applies.
watch(hasControl, (inControl) => {
	if (inControl) return;
	isNoteDialogOpen.value = false;
	note.value = '';
});

// The agent's request ended elsewhere, for example in another browser tab or on a timeout.
watch(
	() => props.userAction,
	(current, previous) => {
		if (previous && !current) hasControl.value = false;
	},
);

async function takeOver() {
	// The agent asked, so the server already gave the user control.
	if (props.userAction) {
		hasControl.value = true;
		return;
	}
	if (isBusy.value) return;
	isBusy.value = true;
	try {
		await postCloudBrowserTakeOver(rootStore.restApiContext, thread.id, props.taskId);
		hasControl.value = true;
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.cloudBrowser.takeOverFailed'));
	} finally {
		isBusy.value = false;
	}
}

function onDone() {
	if (isUserTakeover.value) {
		isNoteDialogOpen.value = true;
		return;
	}
	void returnControl();
}

async function returnControl(userNote?: string) {
	if (isBusy.value) return;
	isBusy.value = true;
	try {
		await postCloudBrowserReturnControl(
			rootStore.restApiContext,
			thread.id,
			props.taskId,
			userNote,
		);
		hasControl.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.cloudBrowser.returnControlFailed'));
	} finally {
		isBusy.value = false;
	}
}
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-browser-preview">
		<div
			v-if="userAction || hasControl"
			:class="$style.banner"
			data-test-id="instance-ai-browser-preview-banner"
		>
			<div :class="$style.bannerText">
				<N8nText tag="div" size="medium" bold :class="$style.bannerTitle">
					{{
						hasControl
							? i18n.baseText('instanceAi.cloudBrowser.youHaveControl')
							: i18n.baseText('instanceAi.cloudBrowser.needsInput')
					}}
				</N8nText>
				<N8nText tag="div" size="medium">
					{{
						hasControl
							? i18n.baseText('instanceAi.cloudBrowser.returnControlHint')
							: userAction?.reason
					}}
				</N8nText>
			</div>
			<N8nButton
				v-if="hasControl"
				variant="brand"
				size="medium"
				:loading="isBusy"
				data-test-id="instance-ai-browser-preview-done"
				@click="onDone"
			>
				{{ i18n.baseText('instanceAi.cloudBrowser.done') }}
			</N8nButton>
		</div>
		<div :class="$style.stage">
			<div :class="$style.window">
				<div
					v-if="showsPlaceholder"
					:class="$style.placeholder"
					data-test-id="instance-ai-browser-preview-placeholder"
				>
					<N8nIcon
						v-if="!isDisconnected"
						icon="loader-circle"
						size="small"
						spin
						aria-hidden="true"
						data-test-id="instance-ai-browser-preview-spinner"
					/>
					{{ placeholder }}
				</div>
				<template v-if="frames.length">
					<iframe
						v-for="frame in frames"
						:key="frame.windowId"
						:src="embeddedLiveViewUrl(frame.liveViewUrl, { navbar: true })"
						:title="
							frame.isCurrent ? i18n.baseText('instanceAi.cloudBrowser.frameTitle') : undefined
						"
						:class="[
							$style.frame,
							{
								[$style.backgroundFrame]: !frame.isCurrent,
								[$style.viewOnly]: !frame.isCurrent || !hasControl,
							},
						]"
						:data-cloud-browser-task-id="taskId"
						:data-cloud-browser-window-id="frame.windowId"
						:tabindex="frame.isCurrent && hasControl ? 0 : -1"
						:aria-hidden="frame.isCurrent ? undefined : 'true'"
						sandbox="allow-same-origin allow-scripts allow-forms"
						allow="clipboard-read; clipboard-write"
						:data-test-id="
							frame.isCurrent
								? 'instance-ai-browser-preview-frame'
								: 'instance-ai-browser-preview-background-frame'
						"
						@load="onFrameLoad(frame.liveViewUrl)"
					/>
					<!-- Shows on hover, or always when the agent asks for the user. -->
					<div
						v-if="!hasControl"
						:class="[$style.overlay, { [$style.overlayVisible]: !!userAction }]"
						data-test-id="instance-ai-browser-preview-overlay"
					>
						<N8nButton
							variant="brand"
							size="large"
							:loading="isBusy"
							data-test-id="instance-ai-browser-preview-take-over"
							@click="takeOver"
						>
							{{ i18n.baseText('instanceAi.cloudBrowser.takeOver') }}
						</N8nButton>
					</div>
				</template>
				<div
					v-if="isNoteDialogOpen"
					:class="$style.noteBackdrop"
					data-test-id="instance-ai-browser-preview-note-dialog"
				>
					<!-- Keeps keyboard focus in the dialog while it is open. -->
					<FocusScope trapped loop as-child>
						<div
							:class="$style.noteDialog"
							role="dialog"
							aria-modal="true"
							aria-labelledby="instance-ai-browser-note-title"
							@keydown.esc="isNoteDialogOpen = false"
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
									:disabled="isBusy"
									data-test-id="instance-ai-browser-preview-note-skip"
									@click="returnControl()"
								>
									{{ i18n.baseText('instanceAi.cloudBrowser.noteSkip') }}
								</N8nButton>
								<N8nButton
									variant="brand"
									size="medium"
									:disabled="!note.trim()"
									:loading="isBusy"
									data-test-id="instance-ai-browser-preview-note-submit"
									@click="returnControl(note.trim())"
								>
									{{ i18n.baseText('instanceAi.cloudBrowser.noteSubmit') }}
								</N8nButton>
							</div>
						</div>
					</FocusScope>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	height: 100%;
	padding: var(--spacing--sm);
}

.banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.bannerText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.bannerTitle {
	color: var(--color--warning--shade-1);
}

.stage {
	flex: 1;
	min-height: 0;
	display: flex;
	justify-content: center;
	align-items: flex-start;
	container-type: size;
}

.window {
	// Browserbase's bar plus the page in the browser window's shape (1280x800, set on the
	// session), as large as fits. Another shape would letterbox the page and shrink it.
	--navbar-height: 32px;
	--browser-aspect: 1.6;
	--window-width: min(100cqw, calc((100cqh - var(--navbar-height)) * var(--browser-aspect)));
	position: relative;
	width: var(--window-width);
	height: calc(var(--window-width) / var(--browser-aspect) + var(--navbar-height));
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--xs);
}

.placeholder {
	position: absolute;
	inset: 0;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
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

.backgroundFrame {
	position: absolute;
	inset: 0;
	visibility: hidden;
}

.viewOnly {
	// Browserbase's way to make a live view read-only: block mouse and keyboard input.
	pointer-events: none;
}

.noteBackdrop {
	position: absolute;
	inset: 0;
	/* Above the loading placeholder, which covers a new window until it loads. */
	z-index: 2;
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

.overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--black-alpha-400);
	opacity: 0;
	transition: opacity 0.15s ease;

	.window:hover &,
	&:focus-within,
	&.overlayVisible {
		opacity: 1;
	}
}
</style>
