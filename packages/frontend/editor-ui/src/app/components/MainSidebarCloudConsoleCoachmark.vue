<script setup lang="ts">
import { N8nButton, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import MainSidebarCloudConsolePreview from '@/app/components/MainSidebarCloudConsolePreview.vue';

defineProps<{
	open: boolean;
	/** The account row the coachmark points at. */
	reference?: HTMLElement;
	showWhatsNew: boolean;
	hasUnread: boolean;
}>();

const emit = defineEmits<{
	showMe: [];
	dismiss: [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nPopover
		:open="open"
		:reference="reference"
		side="right"
		align="end"
		:side-offset="12"
		:collision-padding="12"
		:show-arrow="true"
		:enable-scrolling="false"
		:suppress-auto-focus="true"
		:z-index="2200"
		width="296px"
		:content-class="$style.coachmark"
	>
		<template #content>
			<div :class="$style.content" data-test-id="cloud-console-coachmark">
				<MainSidebarCloudConsolePreview :show-whats-new="showWhatsNew" :has-unread="hasUnread" />
				<div :class="$style.text">
					<p :class="$style.title">
						{{ i18n.baseText('mainSidebar.cloudConsoleCoachmark.title') }}
					</p>
					<p :class="$style.body">
						{{ i18n.baseText('mainSidebar.cloudConsoleCoachmark.body') }}
					</p>
				</div>
				<div :class="$style.actions">
					<N8nButton
						variant="ghost"
						size="small"
						:class="$style.dismiss"
						:label="i18n.baseText('mainSidebar.cloudConsoleCoachmark.gotIt')"
						data-test-id="cloud-console-coachmark-dismiss"
						@click="emit('dismiss')"
					/>
					<N8nButton
						variant="brand"
						size="small"
						:label="i18n.baseText('mainSidebar.cloudConsoleCoachmark.showMe')"
						data-test-id="cloud-console-coachmark-show-me"
						@click="emit('showMe')"
					/>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
/*
 * Inverse, like the app's other coachmarks: it has to stand apart from the menus and panels it
 * points at. The preview inside keeps the app's own colors, so it reads as a picture of the app.
 */
.coachmark.coachmark {
	padding: var(--spacing--xs);
	background-color: var(--background--inverse);
	box-shadow: var(--shadow--xl);
	color: var(--text-color--inverse);

	// The arrow is drawn by the popover, outside the content.
	> :not(.content) svg {
		fill: var(--background--inverse);
		stroke: var(--background--inverse);
	}
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.title {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
}

.body {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	opacity: 0.8;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
}

.dismiss.dismiss {
	color: var(--text-color--inverse);

	&:hover,
	&:focus-visible {
		background-color: color-mix(in srgb, var(--text-color--inverse) 12%, transparent);
		color: var(--text-color--inverse);
	}
}
</style>
