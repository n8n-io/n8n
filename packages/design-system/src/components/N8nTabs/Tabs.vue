<template>
	<div :class="$style.tabs">
		<div v-for="option in options" :key="option.value" :class="{ [$style.alignRight]: option.align === 'right' }">
			<a
				v-if="option.href"
				target="_blank"
				:href="option.href"
				:class="[$style.link, $style.tab]"
				@click="handleTabClick"
			>
				<div>
					{{ option.label }}
					<span :class="$style.external"><n8n-icon icon="external-link-alt" size="small" /></span>
				</div>
			</a>

			<div
				v-else
				:class="{ [$style.tab]: true, [$style.activeTab]: value === option.value }"
				@click="() => handleTabClick(option.value)"
			>
				<n8n-icon v-if="option.icon" :icon="option.icon" size="small" />
				<span v-if="option.label">{{ option.label }}</span>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nIcon from '../N8nIcon';

export default Vue.extend({
	name: 'N8nTabs',
	components: {
		N8nIcon,
	},
	props: {
		value: {
			type: String,
		},
		options: {
		},
	},
	methods: {
		handleTabClick(tab: string) {
			this.$emit('input', tab);
		},
	},
});
</script>


<style lang="scss" module>
.tabs {
	color: var(--color-text-base);
	font-weight: var(--font-weight-bold);
	display: flex;
	width: 100%;
}

.tab {
	display: block;
	padding: 0 var(--spacing-s) var(--spacing-2xs) var(--spacing-s);
	padding-bottom: var(--spacing-2xs);
	font-size: var(--font-size-s);
	cursor: pointer;
	&:hover {
		color: var(--color-primary);
	}
}

.activeTab {
	color: var(--color-primary);
	border-bottom: var(--color-primary) 2px solid;
}

.alignRight {
	margin-left: auto;
}

.link {
	cursor: pointer;
	color: var(--color-text-base);

	&:hover {
		color: var(--color-primary);

		.external {
			display: inline-block;
		}
	}
}

.external {
	display: none;
}

</style>
