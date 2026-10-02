<script lang="ts" setup>
import { N8nApprovalCard, type ApprovalOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useThread } from '../instanceAi.store';

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
const thread = useThread();
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

// Mirrors the floating-approval layout: persistent option first, single-use
// allow next, deny last. Destructive hides the persistent row by design.
const options = computed<ApprovalOption[]>(() => {
	const list: ApprovalOption[] = [];
	if (!isDestructive.value) {
		list.push({
			key: 'allow_domain',
			icon: 'check',
			label: persistentLabel.value,
			suffix: i18n.baseText('instanceAi.confirmation.alwaysAllowSuffix'),
			testId: 'domain-access-allow-domain',
		});
	}
	list.push({
		key: 'allow_once',
		icon: 'check',
		label: i18n.baseText('instanceAi.domainAccess.allowOnce'),
		destructive: isDestructive.value,
		testId: 'domain-access-allow-once',
	});
	list.push({
		key: 'deny',
		icon: 'ban',
		label: i18n.baseText('instanceAi.domainAccess.deny'),
		withArrow: false,
		testId: 'domain-access-deny',
	});
	return list;
});

function handleAction(approved: boolean, domainAccessAction?: DomainAction) {
	resolved.value = true;
	thread.resolveConfirmation(props.requestId, approved ? 'approved' : 'denied');
	void thread.confirmAction(
		props.requestId,
		approved && domainAccessAction
			? { kind: 'domainAccessApprove', domainAccessAction }
			: { kind: 'domainAccessDeny' },
	);
}

function onSelect(key: string) {
	if (key === 'deny') {
		handleAction(false);
		return;
	}
	if (key === 'allow_once' || key === 'allow_domain' || key === 'allow_all') {
		handleAction(true, key);
	}
}
</script>

<template>
	<N8nApprovalCard
		v-if="!resolved"
		:title="promptText"
		title-size="medium"
		:description="previewText"
		:options="options"
		@select="onSelect"
	/>
</template>
