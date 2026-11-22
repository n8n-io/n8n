<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

import type { WizardIssue } from '../wizard.types';

defineProps<{ issues: WizardIssue[] }>();
</script>

<template>
	<ul
		v-if="issues.length > 0"
		:class="$style.list"
		data-test-id="custom-action-wizard-field-issues"
	>
		<li v-for="(issue, index) in issues" :key="`${issue.path}-${index}`">
			<N8nText size="small" color="danger">{{ issue.message }}</N8nText>
		</li>
	</ul>
</template>

<style module lang="scss">
.list {
	list-style: none;
	margin: 0;
	padding: 0;
}
</style>
