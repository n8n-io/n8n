<script lang="ts" setup>
/**
 * PROTOTYPE ONLY — branch `prototype/improve-publish-state`.
 * Header dropdown that lets reviewers force the publish control into any of the
 * 8 redesigned states. Self-gates: renders only when `?prototype=publish` is set.
 */
import { computed } from 'vue';
import { type ActionDropdownItem, N8nActionDropdown, N8nButton } from '@n8n/design-system';
import {
	usePublishStatePrototype,
	type PublishUiState,
} from '@/app/composables/usePublishStatePrototype';

const { isPrototypeMode, mockState, states } = usePublishStatePrototype();

const items = computed<Array<ActionDropdownItem<PublishUiState>>>(() =>
	states.map((state) => ({ id: state.value, label: state.label })),
);

const activatorLabel = computed(
	() => states.find((state) => state.value === mockState.value)?.label ?? 'Prototype state',
);

const onSelect = (value: PublishUiState) => {
	mockState.value = value;
};
</script>

<template>
	<N8nActionDropdown
		v-if="isPrototypeMode"
		:items="items"
		placement="bottom-start"
		:class="$style.switcher"
		data-test-id="publish-prototype-switcher"
		@select="onSelect"
	>
		<template #activator>
			<N8nButton variant="subtle" size="small" data-test-id="publish-prototype-switcher-activator">
				{{ activatorLabel }}
			</N8nButton>
		</template>
	</N8nActionDropdown>
</template>

<style lang="scss" module>
.switcher {
	margin: 0 var(--spacing--xs);
}
</style>
