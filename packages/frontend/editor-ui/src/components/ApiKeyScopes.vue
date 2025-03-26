<script setup>
import { ref, computed, watch } from 'vue';
import { ElSelect, ElOption, ElOptionGroup } from 'element-plus';
import { capitalCase } from 'change-case';
import { useI18n } from '@/composables/useI18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

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
	enabled: {
		type: Boolean,
		default: false,
	},
});

// Define emits
const emit = defineEmits(['update:modelValue']);
const selectedScopes = ref(props.modelValue);

const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();

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

function goToUpgradeApiKeyScopes() {
	void goToUpgrade('api-key-scopes', 'upgrade-api-key-scopes');
}
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
						:disabled="!enabled"
						:class="$style['scopes-checkbox']"
						:indeterminate="indeterminate"
					>
						Select All
					</el-checkbox>
				</template>

				<template v-for="(actions, resource) in groupedScopes" :key="resource">
					<ElOptionGroup :disabled="!enabled" :label="capitalCase(resource).toUpperCase()">
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
		<N8nNotice v-if="!enabled">
			<i18n-t keypath="settings.api.scopes.upgrade">
				<template #link>
					<n8n-link size="small" @click="goToUpgradeApiKeyScopes">
						{{ i18n.baseText('settings.api.scopes.upgrade.link') }}
					</n8n-link>
				</template>
			</i18n-t>
		</N8nNotice>
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
