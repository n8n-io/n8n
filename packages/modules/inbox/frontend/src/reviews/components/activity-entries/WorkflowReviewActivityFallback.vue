<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

// The registry binds `:entry` to every activity component; without this it would
// fall through to the root element as `entry="[object Object]"`.
defineOptions({ inheritAttrs: false });

const i18n = useI18n();
</script>

<template>
	<div :class="$style.entry">
		<!-- Fills the avatar's column like other entries, so the timeline stays on its grid. -->
		<div :class="$style.icon" aria-hidden="true">
			<N8nIcon icon="circle-help" :size="16" color="text-light" />
		</div>
		<N8nText
			size="medium"
			color="text-light"
			:class="$style.line"
			data-test-id="workflow-review-activity-unknown"
		>
			{{ i18n.baseText('workflowReviews.detail.activity.unknownEntry') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
@use '../activity-card' as *;

.entry {
	@include activity-row;
}

.icon {
	@include activity-avatar;

	display: flex;
	width: var(--review-activity--avatar-size);
	height: var(--review-activity--avatar-size);
	align-items: center;
	justify-content: center;
}

.line {
	line-height: var(--review-activity--line-height);
}
</style>
