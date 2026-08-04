<script setup lang="ts">
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nPreviewTag,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	incomplete: boolean;
	connectModelOnly: boolean;
	modelValue: string;
	sandboxValue: string;
	searchValue: string;
	modelConfigured: boolean;
	sandboxConfigured: boolean;
	searchDecided: boolean;
}>();

const emit = defineEmits<{
	setup: [];
	openStep: [step: 'model' | 'sandbox' | 'search'];
	turnOff: [];
}>();

const i18n = useI18n();
const DOCS_URL = 'https://docs.n8n.io/build/ways-of-building-workflows/ai-assistant';
</script>

<template>
	<div
		:class="$style.page"
		:data-test-id="incomplete ? 'assistant-setup-incomplete' : 'assistant-setup-intro'"
	>
		<div :class="[$style.content, incomplete && $style.wide]">
			<N8nIcon icon="sparkles" :size="32" :class="$style.heroIcon" />
			<N8nHeading tag="h1" size="2xlarge" bold :class="$style.title">
				{{ i18n.baseText('instanceAi.onboarding.title') }}
			</N8nHeading>
			<N8nPreviewTag v-if="!incomplete" :class="$style.preview" size="medium" />

			<N8nText v-if="incomplete" tag="p" color="text-light" size="large" :class="$style.lede">
				{{ i18n.baseText('instanceAi.onboarding.incomplete.lede') }}
			</N8nText>

			<div v-if="!incomplete" :class="$style.benefits">
				<div :class="$style.benefit">
					<N8nIcon icon="workflow" size="small" />
					<N8nText size="large">{{ i18n.baseText('instanceAi.onboarding.benefit.build') }}</N8nText>
				</div>
				<div :class="$style.benefit">
					<N8nIcon icon="flask-conical" size="small" />
					<N8nText size="large">{{ i18n.baseText('instanceAi.onboarding.benefit.debug') }}</N8nText>
				</div>
				<div :class="$style.benefit">
					<N8nIcon icon="circle-help" size="small" />
					<N8nText size="large">{{ i18n.baseText('instanceAi.onboarding.benefit.help') }}</N8nText>
				</div>
			</div>

			<div v-else :class="$style.checklist">
				<button
					v-for="item in [
						{
							id: 'model' as const,
							title: i18n.baseText('instanceAi.onboarding.model.label'),
							description: i18n.baseText('instanceAi.onboarding.model.description'),
							value: modelValue,
							configured: modelConfigured,
							mono: true,
						},
						{
							id: 'sandbox' as const,
							title: i18n.baseText('instanceAi.onboarding.sandbox.label'),
							description: i18n.baseText('instanceAi.onboarding.sandbox.description'),
							value: sandboxValue,
							configured: sandboxConfigured,
							mono: false,
						},
						{
							id: 'search' as const,
							title: i18n.baseText('instanceAi.onboarding.search.label'),
							description: i18n.baseText('instanceAi.onboarding.search.description'),
							value: searchValue,
							configured: searchDecided,
							mono: false,
						},
					]"
					:key="item.id"
					type="button"
					:class="$style.checklistRow"
					:data-test-id="`assistant-setup-checklist-${item.id}`"
					@click="emit('openStep', item.id)"
				>
					<span :class="$style.checklistCopy">
						<N8nText bold>{{ item.title }}</N8nText>
						<N8nText color="text-light" step="xs">{{ item.description }}</N8nText>
					</span>
					<N8nText
						step="xs"
						:color="item.configured ? 'text-light' : 'warning'"
						:class="item.mono && $style.mono"
					>
						{{ item.value }}
					</N8nText>
					<N8nIcon icon="chevron-right" size="small" color="text-light" />
				</button>
			</div>

			<div :class="$style.actions">
				<N8nLink v-if="incomplete" :to="DOCS_URL" new-window theme="text" bold>
					{{ i18n.baseText('instanceAi.onboarding.learnMore') }}
				</N8nLink>
				<N8nButton
					variant="solid"
					:data-test-id="incomplete ? 'assistant-finish-setup-cta' : 'assistant-setup-cta'"
					:label="
						incomplete
							? i18n.baseText('instanceAi.onboarding.finishSetup')
							: connectModelOnly
								? i18n.baseText('instanceAi.onboarding.connectModel')
								: i18n.baseText('instanceAi.onboarding.setUp')
					"
					@click="emit('setup')"
				/>
				<N8nLink v-if="!incomplete" :to="DOCS_URL" new-window theme="text" bold>
					{{ i18n.baseText('instanceAi.onboarding.learnMore') }}
				</N8nLink>
			</div>

			<div :class="$style.turnOff">
				<N8nButton
					variant="ghost"
					size="small"
					:label="i18n.baseText('instanceAi.onboarding.turnOff.action')"
					:class="$style.turnOffButton"
					data-test-id="assistant-turn-off"
					@click="emit('turnOff')"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion.scss' as motion;

.page {
	flex: 1;
	min-width: 0;
	overflow: auto;
	display: flex;
	justify-content: center;
	padding: var(--spacing--lg) var(--spacing--lg) var(--spacing--3xl);
}

.content {
	@include motion.fade-in-up;

	width: 100%;
	max-width: 27.5rem;
	margin: auto 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

.wide {
	max-width: 35rem;
}

.heroIcon {
	color: var(--icon-color);
}

.title {
	margin: var(--spacing--sm) 0 0;
}

.preview {
	margin-top: var(--spacing--xs);
}

.lede {
	margin: var(--spacing--sm) 0 0;
}

.benefits {
	margin-top: var(--spacing--md);
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	text-align: left;
}

.benefit {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.benefit svg {
	flex-shrink: 0;
	color: var(--icon-color);
}

.checklist {
	width: 100%;
	margin-top: var(--spacing--lg);
	overflow: hidden;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--md);
}

.checklistRow {
	width: 100%;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 0;
	border-top: var(--border-width--base) var(--border-style--base) var(--border-color--subtle);
	background: transparent;
	color: var(--text-color);
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.checklistRow:first-child {
	border-top: 0;
}

@media (hover: hover) and (pointer: fine) {
	.checklistRow:hover {
		background: var(--background--hover);
	}
}

.checklistCopy {
	min-width: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
}

.mono {
	font-family: var(--font-family--monospace);
}

.actions {
	margin-top: var(--spacing--lg);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
}

.content:not(.wide) .actions {
	flex-direction: column;
	gap: var(--spacing--md);
}

.turnOff {
	width: 100%;
	margin-top: var(--spacing--lg);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
	display: flex;
	justify-content: center;
}

.turnOffButton {
	color: var(--text-color--subtler);
}
</style>
