<script setup lang="ts">
import { computed, watch } from 'vue';
import type { ExecutionCategory, PoolAssignment } from '@n8n/api-types';
import { N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();

const props = defineProps<{
	assignment: PoolAssignment;
	allowedPools: string[];
	availablePools: string[];
	instanceDefaults: PoolAssignment;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:assignment': [value: PoolAssignment];
	'update:allowedPools': [value: string[]];
	'update:isValid': [value: boolean];
}>();

const CATEGORY_KEYS: ExecutionCategory[] = ['production', 'manual', 'evaluation'];

const onUpdateAssignment = (category: ExecutionCategory, value: string) => {
	const next: PoolAssignment = { ...props.assignment };
	if (value === '') {
		delete next[category];
	} else {
		next[category] = value;
	}
	emit('update:assignment', next);
};

const onUpdateAllowedPools = (value: string[]) => {
	// De-dup and trim whitespace from any new chips the user typed
	const seen = new Set<string>();
	const cleaned: string[] = [];
	for (const raw of value) {
		const trimmed = raw.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		cleaned.push(trimmed);
	}
	emit('update:allowedPools', cleaned);
};

const valueForDropdown = (category: ExecutionCategory): string => props.assignment[category] ?? '';

const inheritLabel = (category: ExecutionCategory): string => {
	const instanceValue = props.instanceDefaults[category];
	const base = i18n.baseText('projects.settings.workerPools.defaults.inherit');
	return instanceValue ? `${base} (${instanceValue})` : base;
};

// Union of cluster-available pools + any pools the project has already opted in to.
// Sorted, deduped — used to populate the Allowed pools dropdown options so the admin
// sees both what's actually online and what they had previously configured.
const allowedPoolOptions = computed(() => {
	const set = new Set<string>([...props.availablePools, ...props.allowedPools]);
	return Array.from(set).sort();
});

// When the project has not set an allowlist, the per-category default dropdown should expose
// all cluster pools so the admin can pick anything. Otherwise restrict to the explicit allowlist.
const defaultRoutingOptions = computed(() =>
	props.allowedPools.length > 0 ? [...props.allowedPools].sort() : [...props.availablePools].sort(),
);

const invalidCategories = computed(() => {
	// Empty allowedPools = no restriction; defaults can be any pool.
	if (props.allowedPools.length === 0) return [];
	return CATEGORY_KEYS.filter((category) => {
		const pool = props.assignment[category];
		return pool !== undefined && pool !== '' && !props.allowedPools.includes(pool);
	});
});

const isValid = computed(() => invalidCategories.value.length === 0);

const errorMessage = computed(() => {
	if (isValid.value) return '';
	const category = invalidCategories.value[0];
	const pool = props.assignment[category] ?? '';
	return i18n.baseText('projects.settings.workerPools.error.notInAllowedPools', {
		interpolate: { category, pool },
	});
});

watch(isValid, (value) => emit('update:isValid', value), { immediate: true });
</script>

<template>
	<fieldset data-test-id="project-worker-pools-section">
		<h3>
			<label>{{ i18n.baseText('projects.settings.workerPools.title') }}</label>
		</h3>

		<div :class="$style.subsection">
			<label for="projectAllowedPools">
				{{ i18n.baseText('projects.settings.workerPools.allowedPools.label') }}
			</label>
			<N8nSelect
				id="projectAllowedPools"
				:model-value="props.allowedPools"
				multiple
				filterable
				allow-create
				default-first-option
				:disabled="props.disabled"
				:placeholder="i18n.baseText('projects.settings.workerPools.allowedPools.placeholder')"
				:class="$style.input"
				data-test-id="project-allowed-pools-input"
				@update:model-value="onUpdateAllowedPools"
			>
				<N8nOption v-for="pool in allowedPoolOptions" :key="pool" :label="pool" :value="pool" />
			</N8nSelect>
			<N8nText color="text-light" size="small" :class="$style.help">
				{{ i18n.baseText('projects.settings.workerPools.allowedPools.help') }}
			</N8nText>
		</div>

		<div :class="$style.subsection">
			<N8nText tag="div" bold :class="$style.subheading">
				{{ i18n.baseText('projects.settings.workerPools.defaults.title') }}
			</N8nText>
			<N8nText tag="div" color="text-light" size="small" :class="$style.subheadingHelp">
				{{ i18n.baseText('projects.settings.workerPools.defaults.description') }}
			</N8nText>

			<div
				v-for="category in CATEGORY_KEYS"
				:key="category"
				:class="$style.field"
				:data-test-id="`project-pool-default-${category}`"
			>
				<label :for="`projectPoolDefault-${category}`">
					{{ i18n.baseText(`projects.settings.workerPools.defaults.${category}`) }}
				</label>
				<N8nSelect
					:id="`projectPoolDefault-${category}`"
					:model-value="valueForDropdown(category)"
					:disabled="props.disabled"
					:class="$style.input"
					@update:model-value="(v: string) => onUpdateAssignment(category, v)"
				>
					<N8nOption :label="inheritLabel(category)" :value="''" />
					<N8nOption
						v-for="pool in defaultRoutingOptions"
						:key="pool"
						:label="pool"
						:value="pool"
					/>
				</N8nSelect>
			</div>

			<N8nText
				v-if="!isValid"
				color="danger"
				size="small"
				:class="$style.error"
				data-test-id="project-worker-pools-error"
			>
				{{ errorMessage }}
			</N8nText>
		</div>
	</fieldset>
</template>

<style module lang="scss">
.subsection {
	margin-top: var(--spacing--md);

	&:first-of-type {
		margin-top: 0;
	}
}

.input {
	max-width: var(--project-field--width);
}

.help {
	display: block;
	margin-top: var(--spacing--3xs);
}

.subheading {
	font-size: var(--font-size--sm);
	margin-bottom: var(--spacing--3xs);
}

.subheadingHelp {
	margin-bottom: var(--spacing--sm);
}

.field {
	margin-bottom: var(--spacing--sm);

	&:last-of-type {
		margin-bottom: 0;
	}
}

.error {
	display: block;
	margin-top: var(--spacing--xs);
}
</style>
