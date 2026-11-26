<script setup lang="ts">
import { computed } from 'vue';
import { N8nAvatar, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';

/** The account menu's own conditions, so the sketch shows the rows the user will find. */
defineProps<{
	showWhatsNew: boolean;
	hasUnread: boolean;
}>();

const i18n = useI18n();
const usersStore = useUsersStore();

const user = computed(() => usersStore.currentUser);

const NAV_ROW_WIDTHS = [44, 58, 36];
</script>

<template>
	<!--
		A looping sketch of the sidebar: the old Cloud console row folds into the user row, then
		the account menu opens on it. Every part is drawn with the app's own tokens, so it follows
		the theme. Without motion it shows the end state: the menu open on Cloud console.
	-->
	<div
		:class="[$style.preview, { [$style.withoutWhatsNew]: !showWhatsNew }]"
		role="img"
		:aria-label="i18n.baseText('mainSidebar.cloudConsoleCoachmark.previewLabel')"
		data-test-id="cloud-console-coachmark-preview"
	>
		<div :class="$style.sidebar" aria-hidden="true">
			<div :class="$style.navRows">
				<span v-for="width in NAV_ROW_WIDTHS" :key="width" :class="$style.navRow">
					<span :class="$style.navIcon" />
					<span :class="$style.navText" :style="{ width: `${width}px` }" />
				</span>
			</div>

			<div :class="$style.bottom">
				<span :class="[$style.row, $style.oldRow]">
					<N8nIcon icon="cloud" size="xsmall" />
					<span :class="$style.label">{{ i18n.baseText('mainSidebar.cloudConsole') }}</span>
				</span>
				<span :class="[$style.row, $style.userRow]">
					<span :class="$style.avatar">
						<N8nAvatar :first-name="user?.firstName" :last-name="user?.lastName" size="xxsmall" />
						<span v-if="hasUnread" :class="[$style.dot, $style.avatarDot]" />
					</span>
					<span :class="$style.label">{{ user?.fullName }}</span>
					<N8nIcon icon="chevrons-up-down" size="xsmall" :class="$style.trailing" />
				</span>
			</div>
		</div>

		<div :class="$style.stage" aria-hidden="true">
			<span :class="[$style.step, $style.stepBefore]">{{
				i18n.baseText('mainSidebar.cloudConsoleCoachmark.before')
			}}</span>
			<span :class="[$style.step, $style.stepNow]">{{
				i18n.baseText('mainSidebar.cloudConsoleCoachmark.now')
			}}</span>
			<span :class="$style.node" />
			<span :class="$style.connection" />
			<span :class="$style.node" />
		</div>

		<!-- Same rows, order, icons and dividers as MainSidebarAccountMenu, at a third of the size. -->
		<div :class="$style.menu" aria-hidden="true">
			<div :class="$style.menuHeader">
				<N8nAvatar :first-name="user?.firstName" :last-name="user?.lastName" size="xxsmall" />
				<span :class="$style.identity">
					<span :class="[$style.label, $style.menuName]">{{ user?.fullName }}</span>
					<span :class="[$style.label, $style.menuEmail]">{{ user?.email }}</span>
				</span>
			</div>
			<div :class="$style.menuItems">
				<span :class="[$style.menuRow, $style.menuCloudConsole]">
					<N8nIcon icon="cloud" size="xsmall" />
					<span :class="$style.label">{{ i18n.baseText('mainSidebar.cloudConsole') }}</span>
					<N8nIcon icon="external-link" size="xsmall" :class="$style.trailing" />
				</span>
				<span :class="$style.separator" />
				<span :class="$style.menuRow">
					<N8nIcon icon="circle-user-round" size="xsmall" />
					<span :class="$style.label">{{ i18n.baseText('mainSidebar.personalSettings') }}</span>
				</span>
				<span v-if="showWhatsNew" :class="$style.menuRow">
					<N8nIcon icon="bell" size="xsmall" />
					<span :class="$style.label">{{ i18n.baseText('mainSidebar.whatsNew') }}</span>
					<span v-if="hasUnread" :class="[$style.dot, $style.trailing]" />
				</span>
				<span :class="$style.menuRow">
					<N8nIcon icon="circle-help" size="xsmall" />
					<span :class="$style.label">{{ i18n.baseText('mainSidebar.help') }}</span>
					<N8nIcon icon="chevron-right" size="xsmall" :class="$style.trailing" />
				</span>
				<span :class="$style.separator" />
				<span :class="$style.menuRow">
					<N8nIcon icon="log-out" size="xsmall" />
					<span :class="$style.label">{{ i18n.baseText('auth.signout') }}</span>
				</span>
			</div>
		</div>

		<N8nIcon icon="mouse-pointer" size="small" :class="$style.cursor" aria-hidden="true" />
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';
@use '@n8n/design-system/css/mixins/utils';

/*
 * The sketch is drawn to a fixed 272 × 184 box, the coachmark's inner width. The offsets in
 * the keyframes below are measured on that grid: the user row sits one row (22px) and one gap
 * (4px) under the old Cloud console row, and Cloud console in the open menu sits 109px above
 * the cursor's resting point on the user row.
 */
.preview {
	--cloud-console-preview--duration: 7200ms;
	// How far the cursor climbs from the user row to Cloud console in the open menu.
	--cloud-console-preview--cursor-rise: -108px;

	position: relative;
	width: 100%;
	height: 184px;
	overflow: hidden;
	// The coachmark keeps the popovers' 8px corner around a 12px inset, so the inset gets a
	// tighter corner than the frame to read as nested inside it.
	border-radius: calc(var(--radius) / 2);
	background: var(--background--subtle);
	box-shadow: var(--shadow--outline);
	isolation: isolate;
}

// The menu grows up from the user row, so without the What's new row and its gap,
// Cloud console sits that much lower.
.withoutWhatsNew {
	--cloud-console-preview--cursor-rise: -90px;
}

.sidebar {
	position: absolute;
	inset: 0 auto 0 0;
	width: 120px;
	padding: var(--spacing--2xs) var(--spacing--3xs);
	background: var(--menu--color--background);
	border-right: var(--border);
}

.navRows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.navRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: 18px;
	padding: 0 var(--spacing--4xs);
}

.navIcon {
	width: 10px;
	height: 10px;
	border-radius: 3px;
	background: var(--border-color--strong);
}

.navText {
	height: 6px;
	border-radius: var(--radius--full);
	background: var(--border-color--strong);
}

.bottom {
	position: absolute;
	inset: auto var(--spacing--3xs) var(--spacing--3xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: 22px;
	padding: 0 var(--spacing--4xs);
	border-radius: 5px;
	color: var(--text-color);
	font-size: var(--font-size--3xs);
	line-height: 1;
}

.label {
	@include utils.utils-ellipsis;
	flex: 1;
	min-width: 0;
}

.trailing {
	flex: none;
	color: var(--text-color--subtler);
}

.avatar {
	position: relative;
	display: flex;
}

.dot {
	width: 5px;
	height: 5px;
	border-radius: var(--radius--full);
	background-color: var(--color--danger);
}

.avatarDot {
	position: absolute;
	top: -1px;
	right: -1px;
	box-shadow: 0 0 0 1px var(--menu--color--background);
}

/* At rest the old row is gone, as it is in the app now. */
.oldRow {
	opacity: 0;
	transform-origin: center bottom;
	animation: oldRow var(--cloud-console-preview--duration) infinite;
	@include motion.reduced-motion;
}

.userRow {
	position: relative;
	background: var(--background--active);
	animation: userRow var(--cloud-console-preview--duration) infinite;
	@include motion.reduced-motion;

	&::before {
		content: '';
		position: absolute;
		inset: calc(var(--spacing--4xs) / -2) 0 auto;
		border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
	}
}

.stage {
	position: absolute;
	inset: 0 0 0 120px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.step {
	position: absolute;
	top: var(--spacing--2xs);
	right: var(--spacing--2xs);
	padding: 2px var(--spacing--4xs);
	border-radius: var(--radius--full);
	background: var(--background--surface);
	box-shadow: var(--shadow--outline);
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	line-height: 1.4;
}

.stepBefore {
	opacity: 0;
	animation: stepBefore var(--cloud-console-preview--duration) infinite;
	@include motion.reduced-motion;
}

.stepNow {
	animation: stepNow var(--cloud-console-preview--duration) infinite;
	@include motion.reduced-motion;
}

/* Two nodes and a connection: enough canvas to read as the editor, not enough to draw the eye. */
.node {
	width: 22px;
	height: 22px;
	border-radius: 5px;
	border: var(--border-width) var(--border-style) var(--border-color--strong);
	background: var(--background--surface);
}

.connection {
	width: 20px;
	border-top: var(--border-width) var(--border-style) var(--border-color--strong);
}

.menu {
	position: absolute;
	left: var(--spacing--2xs);
	bottom: 32px;
	width: 144px;
	overflow: hidden;
	border-radius: 6px;
	background: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--md);
	transform-origin: left bottom;
	animation: menu var(--cloud-console-preview--duration) infinite;
	@include motion.reduced-motion;
}

.menuHeader {
	display: flex;
	align-items: center;
	gap: 5px;
	padding: 5px var(--spacing--3xs);
	border-bottom: var(--border);
}

.identity {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.menuName {
	color: var(--text-color);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: 1.2;
}

.menuEmail {
	color: var(--text-color--subtler);
	font-size: var(--font-size--4xs);
	line-height: 1.25;
}

.menuItems {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 3px;
}

.menuRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: 16px;
	padding: 0 var(--spacing--4xs);
	// The menu's 6px corner less its 3px padding, so rows nest inside it.
	border-radius: 3px;
	color: var(--text-color);
	font-size: var(--font-size--3xs);
	line-height: 1;
}

.separator {
	margin: 1px -3px;
	border-top: var(--border);
}

.menuCloudConsole {
	background: var(--background--active);
	animation: menuCloudConsole var(--cloud-console-preview--duration) infinite;
	@include motion.reduced-motion;
}

/*
 * The cursor's tip rests on the user row. The keyframes move it in from the canvas, press
 * the row, then travel up to Cloud console in the open menu.
 */
.cursor {
	position: absolute;
	left: 56px;
	top: 164px;
	z-index: 1;
	color: var(--text-color);
	opacity: 0;
	filter: drop-shadow(0 1px 1px var(--shadow-color));
	transform-origin: left top;
	animation: cursor var(--cloud-console-preview--duration) infinite;
	@include motion.reduced-motion;

	svg {
		fill: var(--background--surface);
	}
}

/*
 * One 7.2s loop, read as a story:
 *   0–14%   before: Cloud console is its own row
 *   14–28%  the row folds down into the user row
 *   30–45%  the cursor comes in and presses the user row
 *   45–51%  the account menu opens
 *   52–60%  the cursor moves to Cloud console, which stays highlighted
 *   88–100% everything resets for the next pass
 */
@keyframes oldRow {
	0% {
		opacity: 0;
		transform: translateY(0) scale(1);
		background: transparent;
	}
	4% {
		opacity: 1;
		transform: translateY(0) scale(1);
		background: transparent;
	}
	8%,
	14% {
		opacity: 1;
		transform: translateY(0) scale(1);
		background: var(--background--hover);
		animation-timing-function: var(--easing--ease-in-out);
	}
	28% {
		opacity: 0;
		transform: translateY(26px) scale(0.6);
		background: var(--background--hover);
	}
	100% {
		opacity: 0;
		transform: translateY(26px) scale(0.6);
	}
}

@keyframes userRow {
	0%,
	24% {
		background: transparent;
		transform: scale(1);
	}
	28% {
		background: var(--background--hover);
		transform: scale(1.03);
		animation-timing-function: var(--easing--ease-out);
	}
	34%,
	41% {
		background: transparent;
		transform: scale(1);
	}
	43% {
		background: var(--background--active);
		transform: scale(0.97);
	}
	46%,
	88% {
		background: var(--background--active);
		transform: scale(1);
	}
	96%,
	100% {
		background: transparent;
	}
}

@keyframes stepBefore {
	0%,
	18% {
		opacity: 1;
	}
	24%,
	94% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}

@keyframes stepNow {
	0%,
	24% {
		opacity: 0;
	}
	30%,
	94% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

@keyframes menu {
	0%,
	45% {
		opacity: 0;
		transform: translateY(4px) scale(0.96);
		animation-timing-function: var(--easing--ease-out);
	}
	51%,
	88% {
		opacity: 1;
		transform: translateY(0) scale(1);
		animation-timing-function: var(--easing--ease-in);
	}
	94%,
	100% {
		opacity: 0;
		transform: translateY(2px) scale(0.98);
	}
}

@keyframes menuCloudConsole {
	0%,
	56% {
		background: transparent;
	}
	60%,
	88% {
		background: var(--background--active);
	}
	94%,
	100% {
		background: transparent;
	}
}

@keyframes cursor {
	0%,
	30% {
		opacity: 0;
		transform: translate(118px, -64px) scale(1);
	}
	33% {
		opacity: 1;
		transform: translate(118px, -64px) scale(1);
		animation-timing-function: var(--easing--ease-in-out);
	}
	41% {
		transform: translate(0, 0) scale(1);
	}
	43% {
		transform: translate(0, 0) scale(0.85);
	}
	46% {
		transform: translate(0, 0) scale(1);
	}
	52% {
		opacity: 1;
		transform: translate(0, 0) scale(1);
		animation-timing-function: var(--easing--ease-in-out);
	}
	60%,
	86% {
		opacity: 1;
		transform: translate(18px, var(--cloud-console-preview--cursor-rise)) scale(1);
	}
	92%,
	100% {
		opacity: 0;
		transform: translate(18px, var(--cloud-console-preview--cursor-rise)) scale(1);
	}
}

@media (prefers-reduced-motion: reduce) {
	.cursor {
		opacity: 1;
		transform: translate(18px, var(--cloud-console-preview--cursor-rise));
	}
}
</style>
