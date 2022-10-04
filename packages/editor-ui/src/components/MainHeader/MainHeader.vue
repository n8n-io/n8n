<template>
	<div>
		<div :class="{'main-header': true, expanded: !sidebarMenuCollapsed}">
			<div v-show="!hideMenuBar" class="top-menu">
				<ExecutionDetails v-if="isExecutionPage" />
				<WorkflowDetails v-else />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { mapGetters } from 'vuex';

import { pushConnection } from '@/components/mixins/pushConnection';

import WorkflowDetails from '@/components/MainHeader/WorkflowDetails.vue';
import ExecutionDetails from '@/components/MainHeader/ExecutionDetails/ExecutionDetails.vue';
import { STICKY_NODE_TYPE, VIEWS } from '@/constants';
import { INodeUi } from '@/Interface';

export default mixins(
	pushConnection,
)
	.extend({
		name: 'MainHeader',
		components: {
			WorkflowDetails,
			ExecutionDetails,
		},
		computed: {
			...mapGetters('ui', [
				'sidebarMenuCollapsed',
			]),
			isExecutionPage (): boolean {
				return this.$route.name === VIEWS.EXECUTION;
			},
			activeNode (): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			hideMenuBar(): boolean {
				return Boolean(this.activeNode && this.activeNode.type !== STICKY_NODE_TYPE);
			},
		},
		async mounted() {
			// Initialize the push connection
			this.pushConnect();
		},
		beforeDestroy() {
			this.pushDisconnect();
		},
	});
</script>

<style lang="scss">
.main-header {
	background-color: var(--color-background-xlight);
	height: $header-height;
	width: 100%;
	box-sizing: border-box;
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
}

.top-menu {
	display: flex;
	align-items: center;
	font-size: 0.9em;
	height: $header-height;
	font-weight: 400;
	padding: 0 20px;
}
</style>
