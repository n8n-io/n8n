<template>
	<RunData :nodeUi="node" :runIndex="runIndex" @openSettings="openSettings" @runChange="onRunIndexChange">
		<template name="header">
			<div :class="$style.titleSection">
				<n8n-select size="medium" v-model="selectedNode" @click.stop>
					<template slot="prepend">
						<span :class="$style.title">{{ $locale.baseText('node.input') }}</span>
					</template>
					<n8n-option v-for="node in workflowNodes" :label="node.name" :value="node.name" :key="node.name"></n8n-option>
				</n8n-select>
			</div>
		</template>
	</RunData>
</template>

<script lang="ts">
import { INodeUi } from '@/Interface';
import Vue from 'vue';
import RunData from './RunData.vue';

export default Vue.extend({
	name: 'InputPanel',
	components: { RunData },
	props: {
		runIndex: {
			type: Number,
		},
	},
	data() {
		return {
			selectedNode: '',
		};
	},
	computed: {
		node (): INodeUi | null {
			if (!this.selectedNode) {
				return null;
			}
			return this.$store.getters.getNodeByName(this.selectedNode);
		},
		workflowNodes (): INodeUi[] {
			return this.$store.getters.allNodes;
		},
	},
	methods: {
		openSettings() {
			this.$emit('openSettings');
		},
		onRunIndexChange(run: number) {
			this.$emit('runChange', run);
		},
	},
});
</script>

<style lang="scss" module>
.titleSection {
	display: flex;

	> * {
		margin-right: var(--spacing-2xs);
	}
}

.title {
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 3px;
	font-weight: var(--font-weight-bold);
}
</style>
