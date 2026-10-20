<script setup lang="ts">
import { computed } from 'vue';
import type { PolicyViolation } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { isRestrictionScope, SCOPE_LABEL_KEY } from '../type-availability-policies.constants';

const props = withDefaults(
	defineProps<{
		violations: PolicyViolation[];
		isJumpable?: (violation: PolicyViolation) => boolean;
		labelOf?: (violation: PolicyViolation) => string | undefined;
	}>(),
	{ isJumpable: () => false, labelOf: () => undefined },
);

const emit = defineEmits<{ jump: [violation: PolicyViolation] }>();

const i18n = useI18n();

const NAME_KEY_BY_KIND: Record<string, BaseTextKey | undefined> = {
	'node-type-unavailable': 'typeAvailabilityPolicies.violations.nodeType',
	'credential-type-unavailable': 'typeAvailabilityPolicies.violations.credentialType',
};

const SCOPE_ORDER = ['instance', 'project'];

type Item = { key: string; text: string; violation: PolicyViolation; jumpable: boolean };
type Group = { scope: string | undefined; heading: string | undefined; items: Item[] };

function itemText(violation: PolicyViolation): string {
	const { kind, subject, message } = violation;
	const key = NAME_KEY_BY_KIND[kind];
	if (!subject || !key) return message;

	return i18n.baseText(key, { interpolate: { name: props.labelOf(violation) ?? subject } });
}

function scopeHeading(scope: string | undefined): string | undefined {
	if (!scope) return undefined;

	return isRestrictionScope(scope) ? i18n.baseText(SCOPE_LABEL_KEY[scope]) : scope;
}

function scopeRank(scope: string | undefined): number {
	if (!scope) return SCOPE_ORDER.length + 1;

	const index = SCOPE_ORDER.indexOf(scope);
	return index === -1 ? SCOPE_ORDER.length : index;
}

const groups = computed(() => {
	const byScope = new Map<string | undefined, Group>();

	for (const violation of props.violations) {
		const text = itemText(violation);
		const key = `${violation.subjectType ?? ''}:${violation.subject ?? ''}:${text}`;

		let group = byScope.get(violation.scope);
		if (!group) {
			group = { scope: violation.scope, heading: scopeHeading(violation.scope), items: [] };
			byScope.set(violation.scope, group);
		}

		if (group.items.some((item) => item.key === key)) continue;
		group.items.push({ key, text, violation, jumpable: props.isJumpable(violation) });
	}

	return [...byScope.values()].sort((a, b) => scopeRank(a.scope) - scopeRank(b.scope));
});
</script>

<template>
	<div :class="$style.list">
		<section
			v-for="group in groups"
			:key="group.scope ?? ''"
			:class="$style.group"
			data-test-id="policy-violation-group"
		>
			<N8nText
				v-if="group.heading"
				tag="p"
				size="small"
				color="text-light"
				data-test-id="policy-violation-scope"
			>
				{{ group.heading }}
			</N8nText>
			<ul :class="$style.items">
				<li
					v-for="item in group.items"
					:key="item.key"
					:class="$style.item"
					data-test-id="policy-violation"
				>
					<button
						v-if="item.jumpable"
						type="button"
						:class="$style.jump"
						:title="i18n.baseText('typeAvailabilityPolicies.violations.jump')"
						data-test-id="policy-violation-jump"
						@click="emit('jump', item.violation)"
					>
						<N8nText size="small" color="primary">{{ item.text }}</N8nText>
					</button>
					<N8nText v-else size="small" color="text-dark">{{ item.text }}</N8nText>
				</li>
			</ul>
		</section>
	</div>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.items {
	margin: 0;
	padding-left: var(--spacing--sm);
	list-style: disc;
}

.item + .item {
	margin-top: var(--spacing--5xs);
}

.jump {
	padding: 0;
	border: 0;
	background: none;
	cursor: pointer;
	text-align: left;

	&:hover,
	&:focus-visible {
		text-decoration: underline;
	}
}
</style>
