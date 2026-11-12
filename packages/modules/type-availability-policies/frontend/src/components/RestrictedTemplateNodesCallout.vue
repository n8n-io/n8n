<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ContactAdminModal from './ContactAdminModal.vue';
import {
	describeRestrictedNodeTypes,
	sharedContactCopy,
	type RestrictedNodeTypeName,
} from '../composables/useNodeTypeRestriction';

const { restricted } = defineProps<{
	restricted: RestrictedNodeTypeName[];
}>();

const i18n = useI18n();

const isContactAdminOpen = ref(false);

const description = computed(() => describeRestrictedNodeTypes(restricted, 'template'));

const contactCopy = computed(() => sharedContactCopy(restricted));

const typeNames = computed(() => restricted.map(({ displayName }) => displayName));
</script>

<template>
	<div>
		<N8nCallout theme="warning" data-test-id="restricted-template-nodes-callout">
			<span :class="$style.description">{{ description }}</span>
			{{ ' ' }}
			<!-- An inline link in the callout's own color, as the design shows. -->
			<button
				type="button"
				:class="$style.contact"
				data-test-id="restricted-template-nodes-contact-admin"
				@click="isContactAdminOpen = true"
			>
				{{ i18n.baseText(contactCopy.action) }}
			</button>
		</N8nCallout>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			kind="node"
			:type-name="typeNames"
			:audience="contactCopy.audience"
		/>
	</div>
</template>

<style lang="scss" module>
.description {
	// The text for several nodes puts each scope on its own line.
	white-space: pre-line;
}

.contact {
	padding: 0;
	border: 0;
	background: none;
	color: inherit;
	font: inherit;
	text-decoration: underline;
	cursor: pointer;
}
</style>
