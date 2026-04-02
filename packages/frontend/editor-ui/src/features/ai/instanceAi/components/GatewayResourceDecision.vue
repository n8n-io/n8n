<script lang="ts" setup>
import { N8nActionDropdown, N8nButton, N8nIconButton } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{
	requestId: string;
	resource: string;
	description: string;
	options: Record<string, string>; // token → decisionKey
}>();

const i18n = useI18n();
const store = useInstanceAiStore();

interface OptionEntry {
	token: string;
	label: string;
}

const DECISION_LABELS: Record<string, string> = {
	allowOnce: i18n.baseText('instanceAi.gatewayConfirmation.allowOnce'),
	allowForSession: i18n.baseText('instanceAi.gatewayConfirmation.allowForSession'),
	alwaysAllow: i18n.baseText('instanceAi.gatewayConfirmation.alwaysAllow'),
	denyOnce: i18n.baseText('instanceAi.gatewayConfirmation.denyOnce'),
	alwaysDeny: i18n.baseText('instanceAi.gatewayConfirmation.alwaysDeny'),
};

const KNOWN_DECISIONS = new Set(Object.keys(DECISION_LABELS));

function getDecisionLabel(decision: string): string {
	return DECISION_LABELS[decision] ?? decision;
}

function findByDecision(decision: string): OptionEntry | undefined {
	const entry = Object.entries(props.options).find(([, d]) => d === decision);
	return entry ? { token: entry[0], label: getDecisionLabel(decision) } : undefined;
}

const denyPrimary = computed(() => findByDecision('denyOnce'));

const denyDropdownItems = computed(() => {
	const items: Array<ActionDropdownItem<string>> = [];
	const alwaysDeny = findByDecision('alwaysDeny');
	if (alwaysDeny) items.push({ id: alwaysDeny.token, label: alwaysDeny.label });
	return items;
});

const approvePrimary = computed(() => findByDecision('allowForSession'));

const approveDropdownItems = computed(() => {
	const items: Array<ActionDropdownItem<string>> = [];
	const allowOnce = findByDecision('allowOnce');
	const alwaysAllow = findByDecision('alwaysAllow');
	if (allowOnce) items.push({ id: allowOnce.token, label: allowOnce.label });
	if (alwaysAllow) items.push({ id: alwaysAllow.token, label: alwaysAllow.label });
	return items;
});

const otherOptions = computed<OptionEntry[]>(() =>
	Object.entries(props.options)
		.filter(([, d]) => !KNOWN_DECISIONS.has(d))
		.map(([token, decision]) => ({ token, label: getDecisionLabel(decision) })),
);

function confirm(token: string): void {
	store.confirmResourceDecision(props.requestId, token);
}
</script>

<template>
	<div :class="$style.root">
		<div :class="$style.body">
			<div :class="$style.message">
				{{
					i18n.baseText('instanceAi.gatewayConfirmation.prompt', {
						interpolate: { resources: props.resource },
					})
				}}
			</div>
			<div :class="$style.preview">{{ props.description }}</div>
		</div>

		<div :class="$style.actions">
			<!-- Unknown options not in the standard set -->
			<N8nButton
				v-for="opt in otherOptions"
				:key="opt.token"
				variant="outline"
				size="small"
				:label="opt.label"
				@click="confirm(opt.token)"
			/>

			<!-- Deny side -->
			<template v-if="denyPrimary">
				<div v-if="denyDropdownItems.length" :class="$style.splitButton">
					<N8nButton
						variant="outline"
						size="small"
						:label="denyPrimary.label"
						:class="$style.splitButtonMain"
						data-test-id="gateway-decision-deny"
						@click="confirm(denyPrimary.token)"
					/>
					<N8nActionDropdown
						:items="denyDropdownItems"
						:class="$style.splitButtonDropdown"
						placement="bottom-start"
						@select="confirm"
					>
						<template #activator>
							<N8nIconButton
								variant="outline"
								icon="chevron-down"
								:class="$style.splitButtonCaret"
								aria-label="More deny options"
								size="small"
							/>
						</template>
					</N8nActionDropdown>
				</div>
				<N8nButton
					v-else
					variant="outline"
					size="small"
					:label="denyPrimary.label"
					data-test-id="gateway-decision-deny"
					@click="confirm(denyPrimary.token)"
				/>
			</template>

			<!-- Approve side -->
			<template v-if="approvePrimary">
				<div v-if="approveDropdownItems.length" :class="$style.splitButton">
					<N8nButton
						variant="solid"
						size="small"
						:label="approvePrimary.label"
						:class="$style.splitButtonMain"
						data-test-id="gateway-decision-approve"
						@click="confirm(approvePrimary.token)"
					/>
					<N8nActionDropdown
						:items="approveDropdownItems"
						:class="$style.splitButtonDropdown"
						placement="bottom-start"
						@select="confirm"
					>
						<template #activator>
							<N8nIconButton
								variant="solid"
								icon="chevron-down"
								:class="$style.splitButtonCaret"
								aria-label="More approve options"
								size="small"
							/>
						</template>
					</N8nActionDropdown>
				</div>
				<N8nButton
					v-else
					variant="solid"
					size="small"
					:label="approvePrimary.label"
					data-test-id="gateway-decision-approve"
					@click="confirm(approvePrimary.token)"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
}

.body {
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.message {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	font-weight: var(--font-weight--medium);
}

.preview {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	word-break: break-all;
	padding: var(--spacing--2xs);
	background: var(--color--background);
	border-radius: var(--radius);
	border: var(--border);
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
