<template>
	<div>
		<div v-if="loading" :class="$style.loading">
			<n8n-loading-blocks :blocks="2" :loading="loading" />
		</div>
		<n8n-card :title="title" v-else>
			<template v-slot:button>
				<slot name="button"></slot>
			</template>
			<template v-slot:content>
				<slot name="content"></slot>
			</template>
		</n8n-card>
	</div>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';
import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateCard',
	props: {
		loading: {
			type: Boolean,
		},
		title: {
			type: String,
			default: '',
		},
	},
});
</script>

<style lang="scss" module>
.loading {
	width: 100%;
	background-color: var(--color-background-xlight);
	border-bottom: $--version-card-border;
	margin-right: var(--spacing-2xs);
	padding: 0 var(--spacing-s) var(--spacing-s);
}
</style>
