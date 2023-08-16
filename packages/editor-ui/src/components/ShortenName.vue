<template>
	<span :title="name" :data-test-id="testId">
		<slot :shortenedName="shortenedName"></slot>
	</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { shorten } from '@/utils';

const DEFAULT_WORKFLOW_NAME_LIMIT = 25;
const WORKFLOW_NAME_END_COUNT_TO_KEEP = 4;

export default defineComponent({
	name: 'ShortenName',
	props: ['name', 'limit', 'testId'],
	computed: {
		shortenedName(): string {
			return shorten(
				this.name,
				this.limit || DEFAULT_WORKFLOW_NAME_LIMIT,
				WORKFLOW_NAME_END_COUNT_TO_KEEP,
			);
		},
	},
});
</script>
