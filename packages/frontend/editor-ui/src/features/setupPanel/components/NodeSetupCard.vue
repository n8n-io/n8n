<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import SetupCredentialLabel from './SetupCredentialLabel.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { NodeSetupState } from '../setupPanel.types';

const props = defineProps<{
	state: NodeSetupState;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	credentialSelected: [payload: { credentialType: string; credentialId: string }];
	credentialDeselected: [credentialType: string];
	testNode: [];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const onHeaderClick = () => {
	expanded.value = !expanded.value;
};

const onCredentialSelected = (credentialType: string, credentialId: string) => {
	emit('credentialSelected', { credentialType, credentialId });
};

const onCredentialDeselected = (credentialType: string) => {
	emit('credentialDeselected', credentialType);
};

const onTestClick = () => {
	emit('testNode');
};

watch(
	() => props.state.isComplete,
	(isComplete) => {
		if (isComplete) {
			expanded.value = false;
		}
	},
);

onMounted(() => {
	if (props.state.isComplete) {
		expanded.value = false;
	}
});
</script>

<template>
	<div
		data-test-id="node-setup-card"
		:class="[$style.card, { [$style.collapsed]: !expanded, [$style.completed]: state.isComplete }]"
	>
		<header data-test-id="node-setup-card-header" :class="$style.header" @click="onHeaderClick">
			<N8nIcon
				v-if="!expanded && state.isComplete"
				data-test-id="node-setup-card-complete-icon"
				icon="check"
				:class="$style['complete-icon']"
				size="medium"
			/>
			<NodeIcon v-else :node-type="nodeType" :size="16" />
			<span :class="$style['node-name']">{{ props.state.node.name }}</span>
			<N8nIcon
				:class="$style.chevron"
				:icon="expanded ? 'chevron-up' : 'chevron-down'"
				size="small"
			/>
		</header>

		<template v-if="expanded">
			<div :class="$style.content">
				<div
					v-for="requirement in state.credentialRequirements"
					:key="requirement.credentialType"
					:class="$style['credential-container']"
				>
					<SetupCredentialLabel
						:node-name="state.node.name"
						:credential-type="requirement.credentialType"
						:nodes-with-same-credential="requirement.nodesWithSameCredential"
					/>
					<CredentialPicker
						create-button-type="secondary"
						:class="$style['credential-picker']"
						:app-name="requirement.credentialDisplayName"
						:credential-type="requirement.credentialType"
						:selected-credential-id="requirement.selectedCredentialId ?? null"
						@credential-selected="onCredentialSelected(requirement.credentialType, $event)"
						@credential-deselected="onCredentialDeselected(requirement.credentialType)"
					/>
				</div>
			</div>

			<footer :class="$style.footer">
				<div v-if="state.isComplete" :class="$style['footer-complete-check']">
					<N8nIcon icon="check" :class="$style['complete-icon']" size="large" />
					<N8nText size="medium" color="success">
						{{ i18n.baseText('generic.complete') }}
					</N8nText>
				</div>
				<N8nButton
					data-test-id="node-setup-card-test-button"
					:label="i18n.baseText('node.testStep')"
					:disabled="!state.isComplete"
					icon="flask-conical"
					size="small"
					@click="onTestClick"
				/>
			</footer>
		</template>
	</div>
</template>

<style module lang="scss">
.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
}

.header {
	display: flex;
	gap: var(--spacing--xs);
	cursor: pointer;
	user-select: none;
	padding: var(--spacing--sm) var(--spacing--sm) 0;

	.card:not(.collapsed) & {
		margin-bottom: var(--spacing--sm);
	}
}

.node-name {
	flex: 1;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
}

.complete-icon {
	color: var(--color--success);
}

.chevron {
	color: var(--color--text--tint-1);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: 0 var(--spacing--sm);
}

.credential-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.credential-picker {
	flex: 1;
}

.footer {
	display: flex;
	justify-content: flex-end;
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.footer-complete-check {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.card.collapsed {
	.header {
		padding: var(--spacing--sm);
	}

	.node-name {
		color: var(--color--text--tint-1);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.card.completed {
	border-color: var(--color--success);

	.footer {
		justify-content: space-between;
	}
}
</style>
