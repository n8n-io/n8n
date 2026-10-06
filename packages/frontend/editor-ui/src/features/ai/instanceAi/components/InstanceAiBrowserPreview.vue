<script lang="ts" setup>
/**
 * PROTOTYPE (cloud browser): the running cloud browser's Live View, in a preview tab.
 * It opens view-only. "Take control" makes it interactive, e.g. to sign in, and
 * "I'm done" hands it back. The frame around it (address bar, buttons) is ours: the
 * Live View is embedded without Browserbase's own bar.
 *
 * TBD: taking control does not pause the sub-agent. Outside a hand-off, both could act on
 * the page at once. A real take-over would tell the sub-agent to wait until released.
 */
import { N8nButton, N8nCheckbox, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { embeddedLiveViewUrl, liveViewKey, viewportAspectRatio } from '../cloudBrowserLink';

import { useThread } from '../instanceAi.store';
import type { BrowserTab } from '../useCanvasPreview';

const props = defineProps<{ tab: BrowserTab }>();

const i18n = useI18n();
const thread = useThread();
const handingBack = ref(false);
/** PROTOTYPE (saved logins): "Remember this login for <site>", sent with "I'm done". */
const rememberLogin = ref(false);
const reloadKey = ref(0);
/**
 * View-only until the user takes control. While the task waits for the user, they have
 * control straight away: that is what they came to the tab for.
 */
const controlling = ref(props.tab.waitingForUser);
const frameUrl = computed(() => embeddedLiveViewUrl(props.tab.url));
// Re-signed links to the same page keep the frame. Only another page, or Reload, reloads it.
const frameKey = computed(() => `${liveViewKey(props.tab.url)}:${reloadKey.value}`);
// The frame takes the browser window's shape, so the page fills it with no bars around it.
const aspectRatio = computed(() => viewportAspectRatio(props.tab.viewport));

// Control follows the hand-off: given when the task starts waiting for the user, taken back
// when it stops. Another browser tab starts from its own state.
watch(
	() => [props.tab.id, props.tab.waitingForUser] as const,
	([, waiting]) => {
		controlling.value = waiting;
	},
);

/** The address bar shows the host and path, like a browser does. */
const address = computed(() => {
	if (!props.tab.pageUrl) return '';
	try {
		const url = new URL(props.tab.pageUrl);
		return `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
	} catch {
		return props.tab.pageUrl;
	}
});
const isSecure = computed(() => props.tab.pageUrl?.startsWith('https://') ?? false);

async function handBack() {
	const taskId = props.tab.taskId;
	if (!taskId || handingBack.value) return;
	handingBack.value = true;
	try {
		await thread.sendTaskCorrection(
			taskId,
			'The user finished the step in the Live View. Check the page and continue.',
			{ rememberLogin: Boolean(props.tab.loginSite) && rememberLogin.value },
		);
		controlling.value = false;
		rememberLogin.value = false;
	} finally {
		handingBack.value = false;
	}
}
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-browser-preview">
		<div :class="$style.stage">
			<div :class="$style.window" :style="{ '--browser-aspect': aspectRatio }">
				<div :class="$style.toolbar">
					<span :class="$style.dots" aria-hidden="true"><span /><span /><span /></span>
					<N8nIcon icon="arrow-left" size="small" :class="$style.toolbarIcon" />
					<N8nIcon icon="arrow-right" size="small" :class="$style.toolbarIcon" />
					<div :class="$style.addressBar" data-test-id="instance-ai-browser-preview-address">
						<N8nIcon v-if="isSecure" icon="lock" size="xsmall" :class="$style.toolbarIcon" />
						<span :class="$style.address" :title="tab.pageUrl">{{ address }}</span>
					</div>
					<N8nButton
						:variant="controlling ? 'outline' : 'solid'"
						size="mini"
						:icon="controlling ? 'eye' : 'mouse-pointer'"
						data-test-id="instance-ai-browser-preview-control"
						@click="controlling = !controlling"
					>
						{{
							controlling
								? i18n.baseText('instanceAi.browserPreview.releaseControl')
								: i18n.baseText('instanceAi.browserPreview.takeControl')
						}}
					</N8nButton>
					<button
						type="button"
						:class="$style.toolbarButton"
						:title="i18n.baseText('instanceAi.browserPreview.reload')"
						:aria-label="i18n.baseText('instanceAi.browserPreview.reload')"
						@click="reloadKey++"
					>
						<N8nIcon icon="refresh-cw" size="small" />
					</button>
					<a
						:href="tab.url"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.toolbarButton"
						:title="i18n.baseText('instanceAi.browserPreview.openInNewWindow')"
						:aria-label="i18n.baseText('instanceAi.browserPreview.openInNewWindow')"
						data-test-id="instance-ai-browser-preview-pop-out"
					>
						<N8nIcon icon="external-link" size="small" />
					</a>
				</div>
				<div
					:class="[$style.frameBox, { [$style.viewOnlyBox]: !controlling && tab.url }]"
					:title="
						!controlling && tab.url
							? i18n.baseText('instanceAi.browserPreview.viewOnlyHint')
							: undefined
					"
				>
					<div
						v-if="!tab.url"
						:class="$style.placeholder"
						data-test-id="instance-ai-browser-preview-placeholder"
					>
						{{
							i18n.baseText(
								tab.starting
									? 'instanceAi.browserPreview.betweenSessions'
									: 'instanceAi.browserPreview.closing',
							)
						}}
					</div>
					<iframe
						v-else
						:key="frameKey"
						:src="frameUrl"
						:title="i18n.baseText('instanceAi.browserPreview.title')"
						:class="[$style.frame, { [$style.viewOnly]: !controlling }]"
						:tabindex="controlling ? 0 : -1"
						sandbox="allow-same-origin allow-scripts allow-forms"
						allow="clipboard-read; clipboard-write"
						data-test-id="instance-ai-browser-preview-frame"
					/>
				</div>
			</div>
		</div>
		<div v-if="tab.waitingForUser && tab.taskId" :class="$style.footer">
			<N8nCheckbox
				v-if="tab.loginSite"
				v-model="rememberLogin"
				:label="
					i18n.baseText('instanceAi.browserPreview.rememberLogin', {
						interpolate: { site: tab.loginSite },
					})
				"
				data-test-id="instance-ai-browser-preview-remember-login"
			/>
			<N8nButton
				variant="solid"
				size="medium"
				:loading="handingBack"
				data-test-id="instance-ai-browser-preview-done"
				@click="handBack"
			>
				{{ i18n.baseText('instanceAi.artifactsPanel.cloudBrowsers.done') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	height: 100%;
	padding: var(--spacing--sm);
	background: var(--color--background);
}

.stage {
	flex: 1;
	min-height: 0;
	display: flex;
	justify-content: center;
	align-items: flex-start;
	// Lets the window size itself against the space it has, in both directions.
	container-type: size;
}

// As wide as fits, but never taller than the stage: the toolbar plus a frame in the
// browser's shape.
.window {
	--toolbar-height: 36px;
	width: min(100cqw, calc((100cqh - var(--toolbar-height)) * (var(--browser-aspect))));
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--xs);
}

.frameBox {
	aspect-ratio: var(--browser-aspect);
	width: 100%;
}

/* The frame ignores the mouse while view-only, so the cursor here is what the user sees. */
.viewOnlyBox {
	cursor: not-allowed;
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

.dots {
	display: inline-flex;
	gap: var(--spacing--4xs);
	margin-right: var(--spacing--3xs);

	span {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: var(--border);
	}
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
	background: white;
}

.viewOnly {
	// Browserbase's suggestion for a read-only Live View: block mouse and keyboard input.
	pointer-events: none;
}

.footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--sm);
}
</style>
