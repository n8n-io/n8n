<template>
	<div :class="$style.container">
		<el-row>
			<el-col :span="8" :class="$style.accessLabel">
				<span>Allow use by</span>
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
				<span>Created</span>
			</el-col>
			<el-col :span="16" :class="$style.valueLabel">
				<TimeAgo :date="currentCredential.createdAt" :capitalize="true" />
			</el-col>
		</el-row>
		<el-row v-if="currentCredential">
			<el-col :span="8" :class="$style.label">
				<span>Last modified</span>
			</el-col>
			<el-col :span="16" :class="$style.valueLabel">
				<TimeAgo :date="currentCredential.updatedAt" :capitalize="true" />
			</el-col>
		</el-row>
		<el-row v-if="currentCredential">
			<el-col :span="8" :class="$style.label">
				<span>ID</span>
			</el-col>
			<el-col :span="16" :class="$style.valueLabel">
				<span>{{currentCredential.id}}</span>
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
