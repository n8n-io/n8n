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

interface DomainProps {
	requestId: string;
	severity?: string;
	url: string;
	host: string;
	query?: never;
}

interface WebSearchProps {
	requestId: string;
	severity?: string;
	query: string;
	url?: never;
	host?: never;
}

const props = defineProps<DomainProps | WebSearchProps>();

const i18n = useI18n();
const store = useInstanceAiStore();
const resolved = ref(false);

const isWebSearch = computed(() => props.query !== undefined);
const isDestructive = computed(() => props.severity === 'destructive');

const promptText = computed(() =>
	isWebSearch.value
		? i18n.baseText('instanceAi.webSearch.prompt')
		: i18n.baseText('instanceAi.domainAccess.prompt', {
				interpolate: { domain: props.host ?? '' },
			}),
);

const previewText = computed(() => (isWebSearch.value ? props.query : props.url) ?? '');

const persistentLabel = computed(() =>
	isWebSearch.value
		? i18n.baseText('instanceAi.webSearch.allowThread')
		: i18n.baseText('instanceAi.domainAccess.allowDomain', {
				interpolate: { domain: props.host ?? '' },
			}),
);

const primaryAction: DomainAction = 'allow_once';

const primaryLabel = computed(() => i18n.baseText('instanceAi.domainAccess.allowOnce'));

const dropdownItems = computed<Array<ActionDropdownItem<DomainAction>>>(() => [
	{ id: 'allow_domain' as const, label: persistentLabel.value },
]);

function handleAction(approved: boolean, domainAccessAction?: DomainAction) {
	resolved.value = true;
	store.resolveConfirmation(props.requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(
		props.requestId,
		approved && domainAccessAction
			? { kind: 'domainAccessApprove', domainAccessAction }
			: { kind: 'domainAccessDeny' },
	);
}

function onPrimaryClick() {
	handleAction(true, primaryAction);
}

const DOMAIN_ACTIONS: readonly DomainAction[] = [
	'allow_once',
	'allow_domain',
	'allow_all',
] as const;

function isDomainAction(value: string): value is DomainAction {
	return (DOMAIN_ACTIONS as readonly string[]).includes(value);
}

function onDropdownSelect(action: string) {
	if (isDomainAction(action)) handleAction(true, action);
}
</script>

<template>
	<div v-if="!resolved">
		<div :class="$style.body">
			<N8nText tag="div" size="medium" bold>
				{{ promptText }}
			</N8nText>
			<ConfirmationPreview>{{ previewText }}</ConfirmationPreview>
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
