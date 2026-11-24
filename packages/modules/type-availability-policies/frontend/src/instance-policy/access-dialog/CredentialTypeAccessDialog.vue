<script setup lang="ts">
import { N8nButton, N8nDialog, N8nDialogBody, N8nDialogFooter, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import TypeAccessSection from './TypeAccessSection.vue';
import { focusDialogContent } from './focusDialogContent';
import { useRelatedTypeIndex } from './useRelatedTypeIndex';
import { getCredentialRelatedTypes } from '../../related-types/relatedTypes';

const { credentialType } = defineProps<{ credentialType: string }>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const { typesLoaded, index, nodeTypeOf, credentialLabel, toSections } = useRelatedTypeIndex();

const credentialName = computed(() => credentialLabel(credentialType));
const sections = computed(() => toSections(getCredentialRelatedTypes(credentialType, index.value)));

const descriptionKey = computed<BaseTextKey>(() =>
	sections.value.some((section) => section.kind === 'credential')
		? 'typeAvailabilityPolicies.accessDialog.related.description'
		: 'typeAvailabilityPolicies.credentialDialog.related.nodesOnly',
);
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="
			i18n.baseText('typeAvailabilityPolicies.credentialDialog.title', {
				interpolate: { name: credentialName },
			})
		"
		size="xlarge"
		data-test-id="credential-type-access-dialog"
		@open-auto-focus="focusDialogContent"
	>
		<N8nDialogBody :class="$style.body">
			<TypeAccessSection
				kind="credential"
				:heading="i18n.baseText('typeAvailabilityPolicies.credentialDialog.credential')"
				:items="[{ name: credentialType, label: credentialName }]"
				:node-type-of="nodeTypeOf"
				:icon-size="24"
				data-test-id="credential-type-access-credential"
			/>

			<template v-if="typesLoaded">
				<N8nText tag="h3" size="medium" color="text-dark" bold>
					{{ i18n.baseText('typeAvailabilityPolicies.credentialDialog.related.heading') }}
				</N8nText>
				<N8nText
					tag="p"
					size="small"
					color="text-dark"
					v-if="sections.length === 0"
					data-test-id="credential-type-access-empty"
				>
					{{
						i18n.baseText('typeAvailabilityPolicies.credentialDialog.related.empty', {
							interpolate: { name: credentialName },
						})
					}}
				</N8nText>
				<template v-else>
					<N8nText
						tag="p"
						size="small"
						color="text-dark"
						data-test-id="credential-type-access-description"
					>
						{{ i18n.baseText(descriptionKey, { interpolate: { name: credentialName } }) }}
					</N8nText>
					<TypeAccessSection
						v-for="section in sections"
						:key="`${credentialType}:${section.kind}`"
						:kind="section.kind"
						:heading="section.heading"
						:items="section.items"
						:node-type-of="nodeTypeOf"
						:data-test-id="`credential-type-access-related-${section.kind}`"
					/>
				</template>
			</template>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="solid" data-test-id="credential-type-access-done" @click="open = false">
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
