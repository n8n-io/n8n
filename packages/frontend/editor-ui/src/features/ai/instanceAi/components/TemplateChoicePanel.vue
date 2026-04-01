<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useTemplateWorkflow } from '@/features/workflows/templates/utils/templateActions';
import type { InstanceAiConfirmResponse } from '@n8n/api-types';

type TemplateChoice = NonNullable<InstanceAiConfirmResponse['templateChoice']>;

const props = defineProps<{
	requestId: string;
	templates: Array<{ templateId: number; name: string; description?: string }>;
	totalResults: number;
	introMessage?: string;
}>();

const emit = defineEmits<{
	submit: [choice: TemplateChoice];
}>();

const i18n = useI18n();
const router = useRouter();
const externalHooks = useExternalHooks();
const telemetry = useTelemetry();
const nodeTypesStore = useNodeTypesStore();
const templatesStore = useTemplatesStore();

const isSubmitting = ref<number | null>(null);
const inlineError = ref('');

const summary = computed(() =>
	i18n.baseText('instanceAi.templateChoice.summary' as BaseTextKey, {
		interpolate: {
			visible: String(props.templates.length),
			total: String(props.totalResults),
		},
	}),
);

function handleAdapt(template: { templateId: number; name: string }) {
	emit('submit', {
		action: 'adapt_with_agent',
		templateId: template.templateId,
		templateName: template.name,
	});
}

async function handleUseNow(template: { templateId: number; name: string }) {
	isSubmitting.value = template.templateId;
	inlineError.value = '';

	try {
		await useTemplateWorkflow({
			router,
			templateId: String(template.templateId),
			inNewBrowserTab: false,
			externalHooks,
			nodeTypesStore,
			telemetry,
			templatesStore,
			source: 'instance_ai_template_choice',
		});

		emit('submit', {
			action: 'use_now',
			templateId: template.templateId,
			templateName: template.name,
		});
	} catch {
		inlineError.value = i18n.baseText('instanceAi.templateChoice.useNowError' as BaseTextKey);
	} finally {
		isSubmitting.value = null;
	}
}
</script>

<template>
	<div :class="$style.root" data-test-id="template-choice-panel">
		<div :class="$style.header">
			<N8nIcon icon="lightbulb" :class="$style.headerIcon" size="small" />
			<span :class="$style.summary">{{ summary }}</span>
		</div>

		<div :class="$style.list">
			<div
				v-for="(tpl, idx) in props.templates"
				:key="tpl.templateId"
				:class="[$style.card, { [$style.cardDisabled]: isSubmitting !== null }]"
			>
				<div :class="$style.cardContent">
					<div :class="$style.cardIndex">{{ idx + 1 }}</div>
					<div :class="$style.cardBody">
						<div :class="$style.cardName">{{ tpl.name }}</div>
						<div v-if="tpl.description" :class="$style.cardDesc">{{ tpl.description }}</div>
					</div>
				</div>
				<div :class="$style.cardActions">
					<button
						:class="$style.adaptBtn"
						:disabled="isSubmitting !== null"
						@click="handleAdapt(tpl)"
					>
						<N8nIcon icon="robot" size="small" />
						{{ i18n.baseText('instanceAi.templateChoice.adapt' as BaseTextKey) }}
					</button>
					<N8nButton
						size="small"
						variant="solid"
						:label="i18n.baseText('instanceAi.templateChoice.useNow' as BaseTextKey)"
						:disabled="isSubmitting !== null"
						:loading="isSubmitting === tpl.templateId"
						@click="handleUseNow(tpl)"
					/>
				</div>
			</div>
		</div>

		<div v-if="inlineError" :class="$style.error">
			<N8nIcon icon="triangle-alert" size="small" />
			{{ inlineError }}
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	border-bottom: var(--border);
}

.headerIcon {
	color: var(--color--warning);
	flex-shrink: 0;
}

.summary {
	line-height: var(--line-height--md);
}

.list {
	display: flex;
	flex-direction: column;
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	transition: background 0.12s ease;

	& + & {
		border-top: var(--border);
	}

	&:hover:not(.cardDisabled) {
		background: var(--color--background--shade-1);
	}
}

.cardDisabled {
	opacity: 0.6;
	pointer-events: none;
}

.cardContent {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.cardIndex {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	border-radius: var(--radius);
	background: var(--color--foreground);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
	margin-top: 1px;
}

.cardBody {
	flex: 1;
	min-width: 0;
}

.cardName {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	line-height: var(--line-height--md);
}

.cardDesc {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	margin-top: var(--spacing--5xs);
}

.cardActions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	padding-top: var(--spacing--4xs);
}

.adaptBtn {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: transparent;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	transition:
		color 0.12s ease,
		border-color 0.12s ease,
		background 0.12s ease;
	white-space: nowrap;

	&:hover:not(:disabled) {
		color: var(--color--primary);
		border-color: var(--color--primary--tint-1);
		background: var(--color--primary--tint-3);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.error {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--danger);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-top: var(--border);
}
</style>
