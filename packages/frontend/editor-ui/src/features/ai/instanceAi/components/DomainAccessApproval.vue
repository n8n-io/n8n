<script lang="ts" setup>
import { N8nActionDropdown, N8nButton, N8nIconButton } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';

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

function onDropdownSelect(action: DomainAction) {
	handleAction(true, action);
}
</script>

<template>
	<div v-if="!resolved" :class="$style.root">
		<div :class="$style.body">
			<div :class="$style.message">
				<span>{{
					i18n.baseText('instanceAi.domainAccess.prompt', { interpolate: { domain: props.host } })
				}}</span>
			</div>
			<div :class="$style.urlPreview">{{ props.url }}</div>
		</div>

		<div :class="$style.actions">
			<N8nButton
				variant="outline"
				size="small"
				:label="i18n.baseText('instanceAi.domainAccess.deny')"
				data-test-id="domain-access-deny"
				@click="handleAction(false)"
			/>
			<div :class="$style.splitButton">
				<N8nButton
					:variant="isDestructive ? 'destructive' : 'solid'"
					:class="$style.splitButtonMain"
					:label="primaryLabel"
					data-test-id="domain-access-primary"
					size="small"
					@click="onPrimaryClick"
				/>
				<N8nActionDropdown
					:items="dropdownItems"
					:class="$style.splitButtonDropdown"
					data-test-id="domain-access-dropdown"
					placement="bottom-start"
					@select="onDropdownSelect"
				>
					<template #activator>
						<N8nIconButton
							:variant="isDestructive ? 'destructive' : 'solid'"
							icon="chevron-down"
							:class="$style.splitButtonCaret"
							aria-label="More approval options"
							size="small"
						/>
					</template>
				</N8nActionDropdown>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	// padding: var(--spacing--xs);
}

.message {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-bottom: var(--spacing--xs);
	font-weight: var(--font-weight--medium);
}

.urlPreview {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	word-break: break-all;
	margin-bottom: var(--spacing--xs);
	padding: var(--spacing--2xs);
	background: var(--color--background);
	border-radius: var(--radius);
	border: var(--border);
}

.body {
	padding: var(--spacing--sm) var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	border-top: var(--border);
	padding: var(--spacing--xs) var(--spacing--sm);
}

.splitButton {
	display: flex;
	position: relative;
}

.splitButtonMain {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.splitButtonDropdown {
	display: flex;
}

.splitButtonCaret {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-left: 1px solid var(--color--foreground--tint-2);
}
</style>
