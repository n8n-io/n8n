<template>
	<div :class="$style.container">
		<executions-sidebar />
		<div :class="$style.content">
				<router-view name="executionPreview" />
		</div>
	</div>
</template>

<script lang="ts">
import ExecutionsSidebar from '@/components/ExecutionsView/ExecutionsSidebar.vue';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { ITag, IWorkflowDb } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { restApi } from '../mixins/restApi';
import { showMessage } from '../mixins/showMessage';

export default mixins(restApi, showMessage).extend({
	name: 'executions-page',
	components: {
		ExecutionsSidebar,
	},
	computed: {
		workflowDataNotLoaded (): boolean {
			return this.$store.getters.workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID && this.$store.getters.workflowName === '';
		},
	},
	async mounted() {
		if (this.workflowDataNotLoaded) {
			await this.openWorkflow(this.$route.params.name);
			await await this.$store.dispatch('workflows/loadCurrentWorkflowExecutions', { status: '' });
		}
	},
	methods: {
		async openWorkflow(workflowId: string): Promise<void> {
			let data: IWorkflowDb | undefined;
				try {
					data = await this.restApi().getWorkflow(workflowId);
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('nodeView.showError.openWorkflow.title'),
					);
					return;
				}
				if (data === undefined) {
					throw new Error(
						this.$locale.baseText(
							'nodeView.workflowWithIdCouldNotBeFound',
							{ interpolate: { workflowId } },
						),
					);
				}
				this.$store.commit('setActive', data.active || false);
				this.$store.commit('setWorkflowId', workflowId);
				this.$store.commit('setWorkflowName', { newName: data.name, setStateDirty: false });
				this.$store.commit('setWorkflowSettings', data.settings || {});
				this.$store.commit('setWorkflowPinData', data.pinData || {});
				const tags = (data.tags || []) as ITag[];
				this.$store.commit('tags/upsertTags', tags);
				const tagIds = tags.map((tag) => tag.id);
				this.$store.commit('setWorkflowTagIds', tagIds || []);
		},
	},
});
</script>

<style module lang="scss">

.container {
	display: flex;
	height: 100%;
}

.content {
	flex: 1;
}

</style>
