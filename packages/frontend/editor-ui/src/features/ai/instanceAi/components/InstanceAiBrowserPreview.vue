<script lang="ts" setup>
/**
 * The live view of a running cloud browser task, in a preview tab. It keeps Browserbase's own
 * bar, which shows the address of the page. The view is read-only.
 */
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject, ref, watch } from 'vue';

import {
	CloudBrowserLiveViewsKey,
	embeddedLiveViewUrl,
} from '../composables/useCloudBrowserLiveViews';

const props = defineProps<{ taskId: string }>();

const i18n = useI18n();
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
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-browser-preview">
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
						:class="[$style.frame, $style.viewOnly, { [$style.backgroundFrame]: !frame.isCurrent }]"
						:data-cloud-browser-task-id="taskId"
						:data-cloud-browser-window-id="frame.windowId"
						tabindex="-1"
						:aria-hidden="frame.isCurrent ? undefined : 'true'"
						sandbox="allow-same-origin allow-scripts allow-forms"
						:data-test-id="
							frame.isCurrent
								? 'instance-ai-browser-preview-frame'
								: 'instance-ai-browser-preview-background-frame'
						"
						@load="onFrameLoad(frame.liveViewUrl)"
					/>
				</template>
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
</style>
