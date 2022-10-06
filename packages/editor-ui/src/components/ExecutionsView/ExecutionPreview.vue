<template>
	<div :class="$style.previewContainer">
		<workflow-preview mode="execution" loaderType="spinner" :executionId="executionId"/>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '../mixins/showMessage';
import WorkflowPreview from '@/components/WorkflowPreview.vue';

export default mixins(restApi, showMessage).extend({
	name: 'execution-preview',
	components: {
		WorkflowPreview,
	},
	data() {
		return {
		};
	},
	computed: {
		executionId(): string {
			return this.$route.params.executionId;
		},
	},
});
</script>

<style module lang="scss">

.previewContainer {
	height: 100%;
	overflow: hidden;
}

</style>
