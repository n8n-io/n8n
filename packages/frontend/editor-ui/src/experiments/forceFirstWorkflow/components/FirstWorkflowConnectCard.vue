<script lang="ts" setup>
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { PROVIDER_OPTIONS } from '../questions';
import { MAILBOX_NODE_TYPE, type DigestProvider } from '../workflows/dailyInboxDigest';

const props = defineProps<{
	provider: DigestProvider;
	isConnecting: boolean;
	hasFailed: boolean;
}>();

const emit = defineEmits<{ connect: []; skip: [] }>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const providerOption = PROVIDER_OPTIONS.find((option) => option.value === props.provider);
</script>

<template>
	<section :class="$style.card" data-test-id="first-workflow-connect">
		<header :class="$style.header">
			<span :class="$style.iconTile" aria-hidden="true">
				<NodeIcon :node-type="nodeTypesStore.getNodeType(MAILBOX_NODE_TYPE[provider])" :size="28" />
			</span>
			<span :class="$style.text">
				<N8nText bold>{{ providerOption ? i18n.baseText(providerOption.labelKey) : '' }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('experiments.forceFirstWorkflow.connect.reason') }}
				</N8nText>
			</span>
		</header>

		<N8nButton
			size="large"
			:loading="isConnecting"
			:class="$style.connect"
			:label="
				i18n.baseText(
					provider === 'gmail'
						? 'experiments.forceFirstWorkflow.connect.buttonGoogle'
						: 'experiments.forceFirstWorkflow.connect.buttonMicrosoft',
				)
			"
			data-test-id="first-workflow-connect-button"
			data-attr="first-workflow-connect-button"
			@click="emit('connect')"
		/>

		<N8nText
			v-if="hasFailed"
			size="small"
			color="danger"
			data-test-id="first-workflow-connect-error"
		>
			{{
				i18n.baseText('experiments.forceFirstWorkflow.connect.error', {
					interpolate: {
						provider: providerOption ? i18n.baseText(providerOption.labelKey) : '',
					},
				})
			}}
		</N8nText>

		<N8nButton
			variant="ghost"
			:label="i18n.baseText('experiments.forceFirstWorkflow.connect.skip')"
			:class="$style.skip"
			data-test-id="first-workflow-connect-skip"
			data-attr="first-workflow-connect-skip"
			@click="emit('skip')"
		/>
	</section>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.iconTile {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	background: var(--color--background--light-1);
	border-radius: var(--radius);
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.connect {
	width: 100%;
	border-radius: var(--radius--full);
}

.skip {
	align-self: center;
}
</style>
