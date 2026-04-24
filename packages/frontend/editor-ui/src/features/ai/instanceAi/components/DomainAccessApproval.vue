<script lang="ts" setup>
import { N8nButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';
import ConfirmationPreview from './ConfirmationPreview.vue';
import SplitButton from './SplitButton.vue';

type DomainAction = 'allow_once' | 'allow_domain' | 'allow_all';

const props = defineProps<{
	requestId: string;
	url: string;
	host: string;
	severity?: string;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const resolved = ref(false);

const isDestructive = computed(() => props.severity === 'destructive');

const primaryAction = computed<DomainAction>(() =>
	isDestructive.value ? 'allow_once' : 'allow_domain',
);

const primaryLabel = computed(() =>
	isDestructive.value
		? i18n.baseText('instanceAi.domainAccess.allowOnce')
		: i18n.baseText('instanceAi.domainAccess.allowDomain'),
);

const dropdownItems = computed<Array<ActionDropdownItem<DomainAction>>>(() =>
	isDestructive.value
		? [
				{
					id: 'allow_domain' as const,
					label: i18n.baseText('instanceAi.domainAccess.allowDomain'),
				},
			]
		: [
				{
					id: 'allow_once' as const,
					label: i18n.baseText('instanceAi.domainAccess.allowOnce'),
				},
			],
);

function handleAction(approved: boolean, domainAccessAction?: string) {
	resolved.value = true;
	store.resolveConfirmation(props.requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(
		props.requestId,
		approved,
		undefined,
		undefined,
		undefined,
		undefined,
		domainAccessAction,
	);
}

function onPrimaryClick() {
	handleAction(true, primaryAction.value);
}

function onDropdownSelect(action: string) {
	handleAction(true, action);
}
</script>

<template>
	<div v-if="!resolved">
		<div :class="$style.body">
			<N8nText tag="div" size="medium" bold>
				{{
					i18n.baseText('instanceAi.domainAccess.prompt', { interpolate: { domain: props.host } })
				}}
			</N8nText>
			<ConfirmationPreview>{{ props.url }}</ConfirmationPreview>
		</div>

		<ConfirmationFooter>
			<N8nButton
				variant="outline"
				size="medium"
				:label="i18n.baseText('instanceAi.domainAccess.deny')"
				data-test-id="domain-access-deny"
				@click="handleAction(false)"
			/>
			<SplitButton
				:variant="isDestructive ? 'destructive' : 'solid'"
				:label="primaryLabel"
				:items="dropdownItems"
				data-test-id="domain-access-primary"
				dropdown-test-id="domain-access-dropdown"
				caret-aria-label="More approval options"
				@click="onPrimaryClick"
				@select="onDropdownSelect"
			/>
		</ConfirmationFooter>
	</div>
</template>

<style lang="scss" module>
.body {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
