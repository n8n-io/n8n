<script setup>
import { ref, computed, watch } from 'vue';
import { ElSelect, ElOption, ElOptionGroup } from 'element-plus';
import { capitalCase } from 'change-case';

// Define props
const props = defineProps({
	modelValue: {
		type: Array,
		default: () => [],
	},
	availableScopes: {
		type: Array,
		default: () => [],
	},
});

// Define emits
const emit = defineEmits(['update:modelValue']);
const selectedScopes = ref(props.modelValue);

// Create reactive state

const checkAll = ref(false);
const indeterminate = ref(false);

// Group the scopes by resource
const groupedScopes = computed(() => {
	const groups = {};

	props.availableScopes.forEach((scope) => {
		const [resource, action] = scope.split(':');

		if (!groups[resource]) {
			groups[resource] = [];
		}

		if (action) {
			groups[resource].push(action);
		}
	});

	return groups;
});

watch(selectedScopes, (newValue) => {
	if (newValue.length === props.availableScopes.length) {
		indeterminate.value = false;
		checkAll.value = true;
	} else if (newValue.length > 0) {
		indeterminate.value = true;
	} else if (newValue.length === 0) {
		indeterminate.value = false;
		checkAll.value = false;
	}
	emit('update:modelValue', newValue);
});

watch(checkAll, (newValue) => {
	if (newValue) {
		selectedScopes.value = props.availableScopes;
	} else {
		selectedScopes.value = [];
	}
});
</script>

<template>
	<div :class="$style['api-key-scopes']">
		<div ref="popperContainer"></div>
		<N8nInputLabel label="Scopes" color="text-dark">
			<ElSelect
				v-model="selectedScopes"
				:popper-class="$style['scopes-dropdown-container']"
				:teleported="true"
				multiple
				collapse-tags
				:max-collapse-tags="10"
				placement="top"
				:reserve-keyword="false"
				placeholder="Select"
				:append-to="popperContainer"
			>
				<template #header>
					<el-checkbox
						v-model="checkAll"
						:class="$style['scopes-checkbox']"
						:indeterminate="indeterminate"
					>
						Select All
					</el-checkbox>
				</template>

				<template v-for="(actions, resource) in groupedScopes" :key="resource">
					<ElOptionGroup :label="capitalCase(resource).toUpperCase()">
						<ElOption
							v-for="action in actions"
							:key="`${resource}:${action}`"
							:label="`${resource}:${action}`"
							:value="`${resource}:${action}`"
						/>
					</ElOptionGroup>
				</template>
			</ElSelect>
		</N8nInputLabel>
	</div>
</template>

<style module>
.api-key-scopes :global(.el-tag) {
	padding: 5px;
}

.api-key-scopes :global(.el-tag__close) {
	color: white;
	margin-left: 5px;
	background-color: var(--color-text-base);
}

.api-key-scopes :global(.el-checkbox) {
	margin-left: var(--spacing-xs);
}

.scopes-dropdown-container :global(.el-select-group__title) {
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	font-weight: var(--font-weight-bold);
	border-bottom: 1.5px solid var(--color-text-lighter);
	padding-left: var(--spacing-xs);
}

.scopes-dropdown-container :global(.el-select-dropdown__item) {
	color: var(--color-text-base);
	font-weight: var(--font-weight-regular);
	padding-left: var(--spacing-xs);
}

.scopes-dropdown-container
	:global(.el-select-dropdown.is-multiple .el-select-dropdown__item.selected) {
	font-weight: var(--font-weight-bold);
}

.scopes-dropdown-container :global(.el-select-group__wrap:not(:last-of-type)) {
	padding: 0px;
	margin-bottom: var(--spacing-xs);
}

.scopes-dropdown-container :global(.el-checkbox) {
	margin-left: var(--spacing-2xs);
}

.scopes-dropdown-container :global(.el-select-dropdown__header) {
	margin-top: 10px;
	padding-bottom: 10px;
	border-bottom: 1.5px solid var(--color-text-lighter);
}

.scopes-checkbox {
	display: flex;
}

.scopes-dropdown-container :global(.el-select-group__wrap::after) {
	display: none;
}
</style>
