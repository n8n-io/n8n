<script setup lang="ts">
import { N8nButton, N8nPopover, N8nText } from '@n8n/design-system';
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
					<N8nText tag="p" bold size="medium" color="text-dark">
						{{ i18n.baseText('mainSidebar.cloudConsoleCoachmark.title') }}
					</N8nText>
					<N8nText tag="p" size="small" color="text-base">
						{{ i18n.baseText('mainSidebar.cloudConsoleCoachmark.body') }}
					</N8nText>
				</div>
				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						size="small"
						:label="i18n.baseText('mainSidebar.cloudConsoleCoachmark.gotIt')"
						data-test-id="cloud-console-coachmark-dismiss"
						@click="emit('dismiss')"
					/>
					<N8nButton
						variant="solid"
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
.coachmark.coachmark {
	padding: var(--spacing--xs);
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

	p {
		margin: 0;
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
}
</style>
