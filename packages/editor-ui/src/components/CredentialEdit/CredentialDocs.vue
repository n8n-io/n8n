<script setup lang="ts">
import Feedback from '@/components/Feedback.vue';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ICredentialType } from 'n8n-workflow';
import { ref } from 'vue';
import VueMarkdown from 'vue-markdown-render';

type Props = {
	credentialType: ICredentialType;
	docs: string;
	documentationUrl: string;
};

const props = defineProps<Props>();

const workflowsStore = useWorkflowsStore();

const i18n = useI18n();
const telemetry = useTelemetry();

const submittedFeedback = ref<'positive' | 'negative'>();

function onFeedback(feedback: 'positive' | 'negative') {
	submittedFeedback.value = feedback;
	telemetry.track('User gave feedback on credential docs', {
		feedback,
		docs_link: props.documentationUrl,
		credential_type: props.credentialType.name,
		workflow_id: workflowsStore.workflowId,
	});
}

function onDocumentationUrlClick(): void {
	telemetry.track('User clicked credential modal docs link', {
		docs_link: props.documentationUrl,
		credential_type: props.credentialType.name,
		source: 'modal-docs-sidebar',
		workflow_id: workflowsStore.workflowId,
	});
}
</script>

<template>
	<div :class="$style.docs">
		<div :class="$style.header">
			<p :class="$style.title">{{ i18n.baseText('credentialEdit.credentialEdit.setupGuide') }}</p>
			<n8n-link
				:class="$style.docsLink"
				theme="text"
				new-window
				:to="documentationUrl"
				@click="onDocumentationUrlClick"
			>
				{{ i18n.baseText('credentialEdit.credentialEdit.docs') }}
				<n8n-icon icon="external-link-alt" size="small" :class="$style.externalIcon" />
			</n8n-link>
		</div>
		<VueMarkdown :source="docs" :options="{ html: true }" :class="$style.markdown" />
		<Feedback
			:class="$style.feedback"
			:model-value="submittedFeedback"
			@update:model-value="onFeedback"
		/>
	</div>
</template>

<style lang="scss" module>
.docs {
	background-color: var(--color-background-light);
	border-left: var(--border-base);
	padding: var(--spacing-s);
	height: 100%;
	overflow-y: auto;
}

.title {
	font-size: var(--font-size-m);
	font-weight: var(--font-weight-bold);
}

.header {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: space-between;
	align-items: center;
	border-bottom: var(--border-base);
	padding-bottom: var(--spacing-s);
	margin-bottom: var(--spacing-s);
}

.docsLink {
	color: var(--color-text-light);

	&:hover .externalIcon {
		color: var(--color-primary);
	}
}

.externalIcon {
	color: var(--color-text-light);
	padding-left: var(--spacing-4xs);
}

.feedback {
	border-top: var(--border-base);
	padding-top: var(--spacing-s);
	margin-top: var(--spacing-s);
}

.markdown {
	color: var(--color-text-base);
	font-size: var(--font-size-xs);
	line-height: var(--font-line-height-xloose);

	h2 {
		font-size: var(--font-size-s);
		color: var(--color-text-base);
		font-weight: var(--font-weight-bold);
		margin-top: var(--spacing-s);
		margin-bottom: var(--spacing-2xs);
	}

	ul,
	ol {
		margin: var(--spacing-2xs) 0;
		margin-left: var(--spacing-m);
	}

	ol ol {
		list-style-type: lower-alpha;
	}

	li > ul,
	li > ol {
		margin: var(--spacing-4xs) 0;
		margin-left: var(--spacing-xs);
	}

	li + li {
		margin-top: var(--spacing-4xs);
	}

	a {
		color: var(--color-text-base);
		text-decoration: underline;
	}

	p {
		line-height: var(--font-line-height-xloose);
		margin-bottom: var(--spacing-2xs);
	}

	img {
		width: 100%;
		padding: var(--spacing-4xs) 0;
	}
}
</style>
