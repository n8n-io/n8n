<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import { ElCol } from 'element-plus';
import { N8nButton, N8nHeading } from '@n8n/design-system';
type Props = {
	titleLocaleKey: BaseTextKey;
	descriptionLocaleKey: BaseTextKey;
};

withDefaults(defineProps<Props>(), {
	titleLocaleKey: 'noTagsView.readyToOrganizeYourWorkflows',
	descriptionLocaleKey: 'noTagsView.withWorkflowTagsYouReFree',
});

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container">
		<ElCol class="notags" :span="16">
			<div class="icon">🗄️</div>
			<div>
				<div class="mb-s">
					<N8nHeading size="large">
						{{ i18n.baseText(titleLocaleKey) }}
					</N8nHeading>
				</div>
				<div class="description">
					{{ i18n.baseText(descriptionLocaleKey) }}
				</div>
			</div>
			<N8nButton label="Create a tag" size="large" @click="$emit('enableCreate')" />
		</ElCol>
	</div>
</template>

<style lang="scss" module>
$--footer-spacing: 45px;

.container {
	display: flex;
	justify-content: center;
	align-items: center;
	margin-top: $--footer-spacing;
}
</style>

<style lang="scss" scoped>
.notags {
	word-break: normal;
	text-align: center;

	> * {
		margin-bottom: 32px;
	}
}

.icon {
	font-size: 36px;
	line-height: 14px;
}

.description {
	font-size: 14px;
	line-height: 21px;
}
</style>
