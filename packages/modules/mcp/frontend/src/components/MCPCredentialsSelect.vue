<script setup lang="ts">
import { N8nSelect, N8nOption, N8nText } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import type { McpCredential } from '../mcp.types';
import { useI18n } from '@n8n/i18n';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';

const props = defineProps<{
	/** The credentials that the user can still enable. */
	credentials: McpCredential[];
	placeholder?: string;
	disabled?: boolean;
}>();

const i18n = useI18n();

const modelValue = defineModel<string[]>({ default: () => [] });

const emit = defineEmits<{
	ready: [];
	confirm: [];
}>();

const credentialTypeNames = capabilityRegistry.tryUse(capabilities.credentialTypeNames);

const isDropdownVisible = ref(false);
const selectRef = ref<InstanceType<typeof N8nSelect>>();
const query = ref('');

const typeName = (credential: McpCredential) =>
	credentialTypeNames?.displayNameOf(credential.type) ?? credential.type;

const projectName = (credential: McpCredential) =>
	credential.homeProject?.type === 'personal'
		? i18n.baseText('projects.menu.personal')
		: (credential.homeProject?.name ?? '');

// The list is already in memory, so the search matches the name, the type and the project here.
const credentialOptions = computed(() => {
	const search = query.value.trim().toLowerCase();
	if (!search) return props.credentials;
	return props.credentials.filter((credential) =>
		[credential.name, typeName(credential), credential.type, projectName(credential)].some(
			(value) => value.toLowerCase().includes(search),
		),
	);
});

const showEmptyState = computed(() => credentialOptions.value.length === 0);

function filterCredentials(value?: string) {
	query.value = value ?? '';
}

function focusOnInput() {
	selectRef.value?.focusOnInput();
}

function onVisibleChange(visible: boolean) {
	isDropdownVisible.value = visible;
	if (!visible) query.value = '';
}

function onKeydownCapture(event: KeyboardEvent) {
	if (event.key === 'Enter' && !isDropdownVisible.value && modelValue.value.length > 0) {
		event.preventDefault();
		event.stopPropagation();
		emit('confirm');
	}
}

onMounted(() => {
	emit('ready');
});

defineExpose({
	focusOnInput,
});
</script>

<template>
	<div @keydown.enter.capture="onKeydownCapture">
		<N8nSelect
			ref="selectRef"
			v-model="modelValue"
			data-test-id="mcp-credentials-select"
			:placeholder="placeholder"
			:disabled="disabled"
			:multiple="true"
			:filterable="true"
			:filter-method="filterCredentials"
			size="medium"
			:popper-class="showEmptyState ? $style['mcp-credentials-select-empty'] : ''"
			:teleported="false"
			@visible-change="onVisibleChange"
		>
			<N8nOption v-if="showEmptyState" value="" disabled :class="$style['empty-option']">
				{{ i18n.baseText('settings.mcp.connectCredentials.emptyState') }}
			</N8nOption>
			<N8nOption
				v-for="credential in credentialOptions"
				:key="credential.id"
				:value="credential.id"
				:label="credential.name"
			>
				<div :class="$style.option">
					<template v-if="projectName(credential)">
						<N8nText :class="$style.truncate">{{ projectName(credential) }}</N8nText>
						<span :class="$style.separator">/</span>
					</template>
					<N8nText :class="$style.truncate" color="text-dark">{{ credential.name }}</N8nText>
					<N8nText :class="[$style.truncate, $style.type]" size="small" color="text-light">
						{{ typeName(credential) }}
					</N8nText>
				</div>
			</N8nOption>
		</N8nSelect>
	</div>
</template>

<style module lang="scss">
.mcp-credentials-select-empty {
	display: flex;
	min-height: var(--spacing--5xl);
	align-items: center;
	justify-content: space-around;
}

.empty-option {
	cursor: default !important;
	color: var(--color--text) !important;
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow: hidden;
}

.separator {
	user-select: none;
	color: var(--color--text--tint-1);
}

.type {
	margin-left: auto;
	padding-left: var(--spacing--sm);
	flex-shrink: 0;
}

.truncate {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}
</style>
