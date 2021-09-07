<template>
	<el-tag
		:type="theme"
		size="medium"
		:class="buttonLabel? $style.centerBanner: $style.banner"
		:disable-transitions="true"
	>
		<div>
			<font-awesome-icon
				:icon="theme === 'success' ? 'check-circle' : 'exclamation-triangle'"
				:class="theme === 'success' ? $style.icon : $style.dangerIcon"
			/>
		</div>
		<div :class="$style.content">
			<div>
				<span>{{ message }}&nbsp;</span>
				<a v-if="details && !expanded" :class="$style.expandButton" @click="expand">More details</a>
			</div>
			<div v-if="expanded" :class="$style.details">
				{{details}}
			</div>
		</div>

		<n8n-button
			v-if="buttonLabel"
			:label="buttonLabel"
			:title="buttonTitle"
			:theme="theme"
			:loading="buttonLoading"
			size="small"
			type="outline"
			:transparentBackground="true"
			@click.stop="onClick"
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
		buttonLoading: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		expand() {
			this.expanded = true;
		},
		onClick() {
			this.expanded = false;
			this.$emit('click');
		},
	},
});
</script>

<style module lang="scss">
.icon {
	margin-right: var(--spacing-xs);
}

.dangerIcon {
	composes: icon;
	color: var(--color-danger);
}

.banner {
	display: flex;
	width: 100%;
	border: none;
}

.centerBanner {
	composes: banner;
	align-items: center;
}

.content {
	flex-grow: 1;
}

.expandButton {
	font-weight: var(--font-weight-bold);
}

.details {
	margin-top: var(--spacing-3xs);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}

</style>
