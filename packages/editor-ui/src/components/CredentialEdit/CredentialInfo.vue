<template>
	<div :class="$style.container">
		<el-row>
			<el-col :span="8" :class="$style.accessLabel">
				<n8n-text :compact="true" :bold="true">Allow use by</n8n-text>
			</el-col>
			<el-col :span="16">
				<div
					v-for="node in nodesWithAccess"
					:key="node.name"
					:class="$style.valueLabel"
				>
					<el-checkbox
						:label="node.displayName"
						:value="!!nodeAccess[node.name]"
						@change="(val) => onNodeAccessChange(node.name, val)"
					/>
				</div>
			</el-col>
		</el-row>
		<el-row v-if="currentCredential">
			<el-col :span="8" :class="$style.label">
				<n8n-text :compact="true" :bold="true">Created</n8n-text>
			</el-col>
			<el-col :span="16" :class="$style.valueLabel">
				<n8n-text :compact="true"><TimeAgo :date="currentCredential.createdAt" :capitalize="true" /></n8n-text>
			</el-col>
		</el-row>
		<el-row v-if="currentCredential">
			<el-col :span="8" :class="$style.label">
				<n8n-text :compact="true" :bold="true">Last modified</n8n-text>
			</el-col>
			<el-col :span="16" :class="$style.valueLabel">
				<n8n-text :compact="true"><TimeAgo :date="currentCredential.updatedAt" :capitalize="true" /></n8n-text>
			</el-col>
		</el-row>
		<el-row v-if="currentCredential">
			<el-col :span="8" :class="$style.label">
				<n8n-text :compact="true" :bold="true">ID</n8n-text>
			</el-col>
			<el-col :span="16" :class="$style.valueLabel">
				<n8n-text :compact="true">{{currentCredential.id}}</n8n-text>
			</el-col>
		</el-row>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import TimeAgo from '../TimeAgo.vue';

export default Vue.extend({
	name: 'CredentialInfo',
	props: ['nodesWithAccess', 'nodeAccess', 'currentCredential'],
	components: {
		TimeAgo,
	},
	methods: {
		onNodeAccessChange(name: string, value: string) {
			this.$emit('accessChange', {
				name,
				value,
			});
		},
	},
});
</script>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-l);
	}
}

.label {
	font-weight: var(--font-weight-bold);
	max-width: 230px;
}

.accessLabel {
	composes: label;
	margin-top: var(--spacing-5xs);
}

.valueLabel {
	font-weight: var(--font-weight-regular);
}

</style>
