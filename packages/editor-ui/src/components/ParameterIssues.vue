<script lang="ts">
import { defineComponent } from 'vue';
import TitledList from '@/components/TitledList.vue';

export default defineComponent({
	name: 'ParameterIssues',
	components: {
		TitledList,
	},
	props: ['issues'],
});
</script>

<template>
	<div v-if="issues.length" :class="$style['parameter-issues']" data-test-id="parameter-issues">
		<n8n-tooltip placement="top">
			<template #content>
				<TitledList :title="`${$locale.baseText('parameterInput.issues')}:`" :items="issues" />
			</template>
			<font-awesome-icon icon="exclamation-triangle" />
		</n8n-tooltip>
	</div>
</template>

<style module lang="scss">
.parameter-issues {
	width: 20px;
	text-align: right;
	float: right;
	color: #ff8080;
	font-size: var(--font-size-s);
	padding-left: var(--spacing-4xs);
}
</style>
