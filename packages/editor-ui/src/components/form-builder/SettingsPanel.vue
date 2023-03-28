<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	inject: ['editor'],
	computed: {
		selectedNode() {
			return this.editor.selectedNode;
		},
		settings() {
			if (!this.selectedNode) {
				return null;
			}

			return this.editor.getSettings(this.selectedNode);
		},
	},
	methods: {
		removeElement() {
			return this.editor.removeNode(this.selectedNode);
		},
	},
});
</script>

<template>
	<div :class="$style.settingsPanel" v-show="selectedNode">
		<div :class="$style.header" v-if="selectedNode">
			<n8n-heading bold size="small" color="text-base">
				{{ selectedNode.componentName }}
			</n8n-heading>
			<n8n-icon-button size="small" type="tertiary" icon="trash" @click="removeElement" />
		</div>
		<div v-if="settings" :class="$style.settings">
			<component
				v-for="(component, name) in settings"
				:key="name"
				:is="component"
				:node="selectedNode"
			></component>
		</div>
	</div>
</template>

<style lang="scss" module>
.settingsPanel {
	display: block;
	padding: var(--spacing-s);
	border-bottom: 1px solid var(--color-foreground-base);
}

.header {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
}

.settings {
	margin-top: var(--spacing-s);
}
</style>
