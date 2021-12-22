<template>
	<div>
		<div :class="{'main-header': true, expanded: !sidebarMenuCollapsed}">
			<div class="top-menu">
				<n8n-heading size="2xlarge">Workflow templates</n8n-heading>
				<div class="right">
					<n8n-button type="outline" label="New blank workflow"></n8n-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import { mapGetters } from 'vuex';

export default {
	name: 'TemplatesHeader',
	computed: {
		...mapGetters('ui', [
			'sidebarMenuCollapsed',
		]),
	},
};
</script>

<style lang="scss">
.main-header {
	position: fixed;
	top: 0;
	background-color: #fff;
	height: 120px;
	width: 100%;
	box-sizing: border-box;

	padding-left: $--sidebar-width;

	&.expanded {
		padding-left: $--sidebar-expanded-width;
	}
}

.top-menu {
	display: flex;
	flex-direction: row;
	align-content: end;
	font-weight: 400;
	padding: 48px;
	//todo var
}

.right {
	// position: relative;
	// margin-right: 0
}

</style>
