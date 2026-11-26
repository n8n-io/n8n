<script setup lang="ts">
import { N8nEmptyState, N8nIcon, N8nInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useTemplateRef } from 'vue';

import RuleCard from './RuleCard.vue';
import { useTypeIcons } from '../composables/useTypeIcons';
import type { RuntimeCredentialRule } from '../runtime-credentials.api';
import type { WizardStepId } from '../runtime-credentials.utils';

/** A search box helps once the list is longer than a screen of cards. */
const SEARCH_THRESHOLD = 5;

const { rules } = defineProps<{ rules: RuntimeCredentialRule[] }>();

const emit = defineEmits<{
	edit: [rule: RuntimeCredentialRule, step: WizardStepId];
	view: [rule: RuntimeCredentialRule];
	duplicate: [rule: RuntimeCredentialRule];
	delete: [rule: RuntimeCredentialRule];
}>();

const i18n = useI18n();
const { credentialLabel, nodeLabel } = useTypeIcons();

const search = ref('');
const searchInput = useTemplateRef<InstanceType<typeof N8nInput>>('searchInput');

const showSearch = computed(() => rules.length > SEARCH_THRESHOLD);

const visibleRules = computed(() => {
	const query = search.value.trim().toLowerCase();
	if (!showSearch.value || query === '') return rules;
	return rules.filter((rule) =>
		[
			rule.alias,
			rule.path,
			rule.nodeType,
			nodeLabel(rule.nodeType),
			rule.credentialType,
			credentialLabel(rule.credentialType),
		].some((value) => value.toLowerCase().includes(query)),
	);
});

// The click removes the clear button, so the focus moves back to the search box.
function clearSearch() {
	search.value = '';
	searchInput.value?.focus();
}
</script>

<template>
	<div :class="$style.list" data-test-id="runtime-rules-list">
		<N8nInput
			v-if="showSearch"
			ref="searchInput"
			v-model="search"
			:placeholder="i18n.baseText('runtimeCredentials.page.search.placeholder')"
			:aria-label="i18n.baseText('runtimeCredentials.page.search.placeholder')"
			size="large"
			clearable
			data-test-id="runtime-rules-search"
		>
			<template #prefix>
				<N8nIcon icon="search" />
			</template>
		</N8nInput>
		<N8nEmptyState
			v-if="visibleRules.length === 0"
			size="small"
			:description="i18n.baseText('runtimeCredentials.page.search.noMatch')"
			:button-text="i18n.baseText('runtimeCredentials.page.search.clear')"
			data-test-id="runtime-rules-no-match"
			@click:button="clearSearch"
		/>
		<ul v-else :class="$style.items">
			<li v-for="rule in visibleRules" :key="rule.alias">
				<RuleCard
					:rule="rule"
					@edit="(target, step) => emit('edit', target, step)"
					@view="emit('view', $event)"
					@duplicate="emit('duplicate', $event)"
					@delete="emit('delete', $event)"
				/>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.items {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}
</style>
