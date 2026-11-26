<script setup lang="ts">
import type { TypeUsage } from '@n8n/api-types';
import { N8nButton, N8nText } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import type { INodeTypeDescription } from 'n8n-workflow';
import { computed, ref } from 'vue';

import TypeAccessSelect from './TypeAccessSelect.vue';
import type { RelatedTypeItem } from './useRelatedTypeIndex';
import { useTypeAccessEdits } from './useTypeAccessEdits';
import type { RestrictedTypeKind } from '../../type-availability-policies.constants';

const {
	kind,
	items,
	iconSize = 20,
} = defineProps<{
	kind: RestrictedTypeKind;
	heading: string;
	items: RelatedTypeItem[];
	/** Resolves a node type for its icon. */
	nodeTypeOf: (name: string) => INodeTypeDescription | undefined;
	iconSize?: number;
}>();

/** The section shows this many items, then a button for the rest. */
const SECTION_LIMIT = 6;

const i18n = useI18n();
const NodeTypeIcon = computed(() => componentRegistry.get('node-type-icon'));
const CredentialTypeIcon = computed(() => componentRegistry.get('credential-type-icon'));
const { accessOf, isLocked, isChecking, canManage, usageOf, setAccess } = useTypeAccessEdits();

const expanded = ref(false);

/** The same counts as the Uses, Workflows and Active workflows columns of the policy table. */
function usageText(usage: TypeUsage): string {
	if (usage.uses === 0) return i18n.baseText('typeAvailabilityPolicies.usage.none');
	return i18n.baseText('typeAvailabilityPolicies.usage.summary', {
		interpolate: {
			uses: i18n.baseText('typeAvailabilityPolicies.usage.times', {
				adjustToNumber: usage.uses,
				interpolate: { count: String(usage.uses) },
			}),
			workflows: i18n.baseText('typeAvailabilityPolicies.usage.workflows', {
				adjustToNumber: usage.workflows,
				interpolate: { count: String(usage.workflows) },
			}),
			active: String(usage.activeWorkflows),
		},
	});
}

const visibleItems = computed(() =>
	(expanded.value ? items : items.slice(0, SECTION_LIMIT)).map((item) => {
		const usage = usageOf(kind, item.name);
		return { ...item, usage: usage ? usageText(usage) : undefined };
	}),
);
</script>

<template>
	<section :class="$style.section">
		<N8nText tag="p" size="small" color="text-light" bold>{{ heading }}</N8nText>
		<ul :class="$style.list">
			<li
				v-for="item in visibleItems"
				:key="item.name"
				:class="$style.item"
				data-test-id="type-access-item"
			>
				<component
					:is="NodeTypeIcon"
					v-if="kind === 'node' && NodeTypeIcon"
					:node-type="nodeTypeOf(item.name)"
					:size="iconSize"
				/>
				<component
					:is="CredentialTypeIcon"
					v-else-if="kind === 'credential' && CredentialTypeIcon"
					:credential-type-name="item.name"
					:size="iconSize"
				/>
				<div :class="$style.name">
					<N8nText tag="p" size="medium" color="text-dark">{{ item.label }}</N8nText>
					<N8nText
						v-if="item.usage"
						tag="p"
						size="small"
						color="text-light"
						data-test-id="type-access-item-usage"
					>
						{{ item.usage }}
					</N8nText>
				</div>
				<TypeAccessSelect
					v-if="canManage(kind)"
					:model-value="accessOf(kind, item.name)"
					:label="item.label"
					:disabled="isLocked(kind, item.name)"
					:loading="isChecking(kind, item.name)"
					@update:model-value="(action) => setAccess(kind, item.name, action, item.label)"
				/>
			</li>
		</ul>
		<N8nButton
			v-if="!expanded && items.length > SECTION_LIMIT"
			variant="ghost"
			size="small"
			:class="$style.more"
			data-test-id="type-access-show-more"
			@click="expanded = true"
		>
			{{
				i18n.baseText('typeAvailabilityPolicies.accessDialog.related.more', {
					interpolate: { count: String(items.length - SECTION_LIMIT) },
				})
			}}
		</N8nButton>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.name {
	flex: 1;
	min-width: 0;
}

.more {
	align-self: flex-start;
}
</style>
