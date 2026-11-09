<script setup lang="ts">
import type { InboxState } from '@n8n/api-types';
import { N8nDropdownMenu, N8nText, type DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { setPrototypeState } from './prototype.session';

const props = defineProps<{
	itemId: string;
	state: InboxState;
	/** What the open row says. A self-healing result keeps its outcome here. */
	openLabel: string;
}>();

const i18n = useI18n();
const closedLabel = computed(() => i18n.baseText('inbox.tabs.closed'));
const items = computed<Array<DropdownMenuItemProps<InboxState>>>(() => [
	{ id: 'open', label: props.openLabel, checked: props.state === 'open' },
	{ id: 'closed', label: closedLabel.value, checked: props.state === 'closed' },
]);

function onSelect(state: InboxState) {
	setPrototypeState(props.itemId, state);
}
</script>

<template>
	<N8nDropdownMenu :items="items" placement="bottom-start" width="11rem" @select="onSelect">
		<template #trigger>
			<button type="button" :class="$style.pill" data-test-id="inbox-prototype-status">
				<slot />
				<N8nText size="small">{{ state === 'closed' ? closedLabel : openLabel }}</N8nText>
			</button>
		</template>
	</N8nDropdownMenu>
</template>

<style module lang="scss">
.pill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: fit-content;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--light-3);
	color: inherit;
	cursor: pointer;
}
</style>
