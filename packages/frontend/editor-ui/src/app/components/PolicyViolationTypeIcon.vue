<script setup lang="ts">
import type { PolicyViolation } from '@n8n/api-types';
import { computed } from 'vue';

import NodeIcon from '@/app/components/NodeIcon.vue';
import {
	CREDENTIAL_TYPE_SUBJECT,
	NODE_TYPE_SUBJECT,
} from '@/app/composables/usePolicyViolationLabels';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';

const { violation, size = 20 } = defineProps<{ violation: PolicyViolation; size?: number }>();

const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() =>
	violation.subjectType === NODE_TYPE_SUBJECT && violation.subject
		? nodeTypesStore.getNodeType(violation.subject)
		: null,
);
</script>

<template>
	<NodeIcon v-if="nodeType" :node-type="nodeType" :size="size" />
	<CredentialIcon
		v-else-if="violation.subjectType === CREDENTIAL_TYPE_SUBJECT && violation.subject"
		:credential-type-name="violation.subject"
		:size="size"
	/>
</template>
