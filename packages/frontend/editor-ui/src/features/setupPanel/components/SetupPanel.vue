<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container" data-test-id="setup-panel-container">
		<div :class="$style['empty-state']">
			<N8nText color="text-base" size="medium" :bold="true">
				{{ i18n.baseText('setupPanel.test.intro') }}
			</N8nText>
			<N8nText color="text-base" size="small">
				{{ i18n.baseText('setupPanel.test.description') }}
			</N8nText>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	height: 100%;
	width: 100%;
	align-items: center;
	justify-content: center;
}

.empty-state {
	display: flex;
	flex-direction: column;
	text-align: center;
	align-items: center;
}
</style>
