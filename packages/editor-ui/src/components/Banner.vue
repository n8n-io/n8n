<template>
	<el-tag
		:type="theme"
		size="medium"
		:class="buttonLabel? $style.centerBanner: $style.banner"
	>
		<div>
			<font-awesome-icon
				:icon="theme === 'success' ? 'check-circle' : 'exclamation-triangle'"
				:class="$style.icon"
			/>
		</div>
		<div :class="$style.content">
			<div>
				<span>{{ message }}&nbsp;</span>
				<a v-if="details && !expanded" @click="expand">More details</a>
			</div>
			<div v-if="expanded" :class="$style.details">
				{{details}}
			</div>
		</div>

		<n8n-button
			v-if="buttonLabel"
			:label="$props.buttonLabel"
			:title="$props.buttonTitle"
			:theme="theme"
			size="small"
			type="outline"
			:transparentBackground="true"
			@click.stop="$emit('click')"
		/>
	</el-tag>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'Banner',
	data() {
		return {
			expanded: false,
		};
	},
	props: {
		theme: {
			type: String,
			validator: (value: string): boolean =>
				['success', 'danger'].indexOf(value) !== -1,
		},
		message: {
			type: String,
		},
		buttonLabel: {
			type: String,
		},
		buttonTitle: {
			type: String,
		},
		details: {
			type: String,
		},
	},
	methods: {
		expand() {
			this.expanded = true;
		},
	},
});
</script>

<style module lang="scss">
.icon {
	margin-right: var(--spacing-xs);
}

.banner {
	display: flex;
	width: 100%;
}

.centerBanner {
	composes: banner;
	align-items: center;
}

.content {
	flex-grow: 1;
}

.details {
	margin-top: var(--spacing-5xs);
	color: var(--color-text-base);
}

</style>
