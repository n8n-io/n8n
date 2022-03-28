<template>
	<span :class="$style.container" @click="onEdit">
		<span :class="$style.iconWrapper"><NodeIcon :nodeType="nodeType" :size="18" /></span>
		<el-popover
			placement="right"
			width="200"
			:value="editName"
			>
			<div :class="$style.editContainer" @keydown.enter="onRename" @keydown.stop @keydown.esc="editName = false">
				<n8n-text :bold="true" color="text-base">Rename node</n8n-text>
				<n8n-input ref="input" size="small" v-model="newName" />
				<div :class="$style.editButtons">
					<n8n-button type="outline" size="small" @click="editName = false" label="Cancel" />
					<n8n-button type="primary" size="small" @click="onRename" label="Rename" />
				</div>
			</div>
			<span :class="$style.title" slot="reference">
				{{value}}
				<font-awesome-icon :class="$style.editIcon" icon="pencil-alt" />
			</span>
		</el-popover>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'NodeTitle',
	props: {
		value: {
			type: String,
		},
		nodeType: {
		},
	},
	data() {
		return {
			editName: false,
			newName: '',
		};
	},
	methods: {
		onEdit() {
			this.newName = this.value;
			this.editName = true;
			this.$nextTick(() => {
				const input = this.$refs.input;
				if (input) {
					(input as HTMLInputElement).focus();
				}
			});
		},
		onRename() {
			this.$emit('input', this.newName);
			this.editName = false;
		},
	},
});
</script>

<style lang="scss" module>
.container {
	font-weight: var(--font-weight-bold);
	display: flex;
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-compact);
	overflow-wrap: anywhere;
	height: 60px;
  overflow: hidden;
}

.title {
  text-overflow: ellipsis;

	&:hover {
		.editIcon {
			display: inline-block;
		}
	}
}

.iconWrapper {
	display: inline-flex;
	margin-right: var(--spacing-2xs);
}

.editIcon {
	display: none;
	font-size: var(--font-size-2xs);
}

.editButtons {
	text-align: right;
	margin-top: var(--spacing-s);

	> * {
		margin-left: var(--spacing-4xs);
	}
}

.editContainer {
	text-align: left;
}
</style>
