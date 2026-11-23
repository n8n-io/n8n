<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TypeAccessSection from './TypeAccessSection.vue';
import { focusDialogContent } from './focusDialogContent';
import { useRelatedTypeIndex } from './useRelatedTypeIndex';
import { useTypeAccessEdits } from './useTypeAccessEdits';
import { ANY_CREDENTIAL_NODE_TYPES } from '../../related-types/relatedTypes.constants';
import { getRelatedTypes } from '../../related-types/relatedTypes';

const { nodeType } = defineProps<{ nodeType: string }>();

const open = defineModel<boolean>('open', { default: false });

const RELATED_TAB = 'related';

const i18n = useI18n();
const { typesLoaded, index, nodeTypeOf, nodeLabel, toSections } = useRelatedTypeIndex();
const { canManage } = useTypeAccessEdits();

const nodeName = computed(() => nodeLabel(nodeType));
const sections = computed(() => toSections(getRelatedTypes(nodeType, index.value)));

const relatedCount = computed(() =>
	sections.value.reduce((count, section) => count + section.items.length, 0),
);

const tabs = computed(() => [
	{
		value: RELATED_TAB,
		label: i18n.baseText('typeAvailabilityPolicies.nodeDialog.relatedTab'),
		tag: typesLoaded.value ? String(relatedCount.value) : undefined,
	},
]);
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="
			i18n.baseText('typeAvailabilityPolicies.nodeDialog.title', {
				interpolate: { name: nodeName },
			})
		"
		size="xlarge"
		data-test-id="node-type-access-dialog"
		@open-auto-focus="focusDialogContent"
	>
		<N8nDialogBody :class="$style.body">
			<TypeAccessSection
				kind="node"
				:heading="i18n.baseText('typeAvailabilityPolicies.nodeDialog.node')"
				:items="[{ name: nodeType, label: nodeName }]"
				:node-type-of="nodeTypeOf"
				:icon-size="24"
				data-test-id="node-type-access-node"
			/>

			<N8nTabs :model-value="RELATED_TAB" :options="tabs" />

			<template v-if="typesLoaded">
				<N8nText
					tag="p"
					size="small"
					color="text-dark"
					v-if="ANY_CREDENTIAL_NODE_TYPES.has(nodeType) && canManage('credential')"
					data-test-id="node-type-access-any-credential"
				>
					{{
						i18n.baseText('typeAvailabilityPolicies.nodeDialog.related.anyCredential', {
							interpolate: { name: nodeName },
						})
					}}
				</N8nText>
				<N8nText
					tag="p"
					size="small"
					color="text-dark"
					v-else-if="sections.length === 0"
					data-test-id="node-type-access-empty"
				>
					{{
						i18n.baseText('typeAvailabilityPolicies.nodeDialog.related.empty', {
							interpolate: { name: nodeName },
						})
					}}
				</N8nText>
				<template v-else>
					<N8nText tag="p" size="small" color="text-dark">
						{{
							i18n.baseText('typeAvailabilityPolicies.accessDialog.related.description', {
								interpolate: { name: nodeName },
							})
						}}
					</N8nText>
					<TypeAccessSection
						v-for="section in sections"
						:key="`${nodeType}:${section.kind}`"
						:kind="section.kind"
						:heading="section.heading"
						:items="section.items"
						:node-type-of="nodeTypeOf"
						:data-test-id="`node-type-access-related-${section.kind}`"
					/>
				</template>
			</template>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="solid" data-test-id="node-type-access-done" @click="open = false">
				{{ i18n.baseText('generic.done') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	gap: var(--spacing--sm);
}
</style>
