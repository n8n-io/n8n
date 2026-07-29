<script setup lang="ts">
import { N8nCollapsiblePanel, N8nHeading } from '@n8n/design-system';

defineProps<{
	title: string;
	listTestId: string;
}>();

const expanded = defineModel<boolean>({ required: true });
</script>

<template>
	<div :class="$style.section">
		<N8nCollapsiblePanel v-model="expanded" :class="$style.sectionPanel" :disable-animation="true">
			<template #title>
				<N8nHeading size="small" color="text-light" tag="h3">
					{{ title }}
				</N8nHeading>
			</template>
			<div :class="$style.toolsList" :data-test-id="listTestId">
				<slot />
			</div>
		</N8nCollapsiblePanel>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
}

.sectionPanel.sectionPanel {
	border: 0;
	border-radius: 0;
	background-color: transparent;
}

.toolsList {
	display: flex;
	flex-direction: column;
}
</style>
