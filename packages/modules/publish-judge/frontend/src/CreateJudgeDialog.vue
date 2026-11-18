<script setup lang="ts">
import type { PublishJudgeType } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSegmentControl,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';
import { computed, ref } from 'vue';

import type { JudgeProjectOption } from './publish-judge.api';
import type { JudgeRuleSuggestion } from './publish-judge.suggestions';
import { JUDGE_RULE_GROUPS } from './publish-judge.suggestions';

const props = defineProps<{
	projects: JudgeProjectOption[];
	/** The judges project, where the Assistant builds the judge. */
	libraryProjectId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

/** The select needs a string value, and a project id is never empty. */
const INSTANCE_SCOPE = '';
type JudgeTypeChoice = PublishJudgeType | 'auto';

const i18n = useI18n();
const toast = useToast();
const clipboard = useClipboard();
// The shell provides this after the module loads, so a missing one means "no Assistant".
const assistant = capabilityRegistry.tryUse(capabilities.createPublishJudgeAssistantHandoff)?.();

const scope = ref(INSTANCE_SCOPE);
const judgeType = ref<JudgeTypeChoice>('auto');
const rules = ref('');
const isStarting = ref(false);

const typeOptions = computed(() => [
	{ label: i18n.baseText('publishJudge.create.type.auto'), value: 'auto' as const },
	{ label: i18n.baseText('publishJudge.type.workflow'), value: 'workflow' as const },
	{ label: i18n.baseText('publishJudge.type.agent'), value: 'agent' as const },
]);
type ScopeIcon = { type: 'icon'; value: IconName } | { type: 'emoji'; value: string };
const INSTANCE_ICON: ScopeIcon = { type: 'icon', value: 'globe' };
const DEFAULT_PROJECT_ICON: ScopeIcon = { type: 'icon', value: 'layers' };

/** Same look as the project picker of the move and share dialogs: an icon, a name, a hint. */
const scopeOptions = computed(() => [
	{
		id: INSTANCE_SCOPE,
		name: i18n.baseText('publishJudge.create.scope.instance'),
		hint: i18n.baseText('publishJudge.create.scope.instance.hint'),
		icon: INSTANCE_ICON,
	},
	...props.projects.map((project) => ({
		id: project.id,
		name: project.name ?? project.id,
		hint: i18n.baseText('publishJudge.create.scope.project.hint'),
		// A stored icon name is one of the design system, checked when the project was saved.
		icon: (project.icon as ScopeIcon | null | undefined) ?? DEFAULT_PROJECT_ICON,
	})),
]);
const selectedScope = computed(
	() => scopeOptions.value.find(({ id }) => id === scope.value) ?? scopeOptions.value[0],
);

const isAssistantReady = computed(() => assistant?.available.value ?? false);
const hasRules = computed(() => rules.value.trim().length > 0);
const ruleLine = (suggestion: JudgeRuleSuggestion) => `- ${i18n.baseText(suggestion.rule)}`;
const isSelected = (suggestion: JudgeRuleSuggestion) => rules.value.includes(ruleLine(suggestion));

/** The request the Assistant gets. Its publish judge skill knows the judge contract. */
const request = computed(() => {
	const project = props.projects.find(({ id }) => id === scope.value);
	const target = project
		? i18n.baseText('publishJudge.create.request.project', {
				interpolate: { name: project.name ?? project.id, id: project.id },
			})
		: i18n.baseText('publishJudge.create.request.instance');

	return [
		i18n.baseText('publishJudge.create.request.intro', { interpolate: { target } }),
		i18n.baseText(`publishJudge.create.request.type.${judgeType.value}`),
		`${i18n.baseText('publishJudge.create.request.rules')}\n${rules.value.trim()}`,
		i18n.baseText('publishJudge.create.request.steps'),
	].join('\n\n');
});

function toggle(suggestion: JudgeRuleSuggestion) {
	const line = ruleLine(suggestion);
	const lines = rules.value.split('\n').filter((existing) => existing.trim() !== '');

	rules.value = (
		lines.includes(line) ? lines.filter((existing) => existing !== line) : [...lines, line]
	).join('\n');
}

async function start() {
	if (!assistant) return;

	isStarting.value = true;
	try {
		const outcome = await assistant.start(request.value, props.libraryProjectId ?? undefined);
		if (outcome === 'started') open.value = false;
		else toast.showError(new Error(outcome), i18n.baseText('publishJudge.create.startError'));
	} finally {
		isStarting.value = false;
	}
}

async function copyRequest() {
	await clipboard.copy(request.value);
	toast.showMessage({ title: i18n.baseText('publishJudge.create.copied'), type: 'success' });
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="large"
		:header="i18n.baseText('publishJudge.create.title')"
		data-test-id="publish-judge-create-dialog"
	>
		<N8nDialogBody :class="$style.body">
			<N8nText tag="p" color="text-light">
				{{ i18n.baseText('publishJudge.create.description') }}
			</N8nText>
			<div :class="$style.row">
				<N8nInputLabel
					:label="i18n.baseText('publishJudge.create.scope.label')"
					size="small"
					color="text-dark"
				>
					<N8nSelect
						v-model="scope"
						size="medium"
						:teleported="false"
						:popper-class="$style.scopePopper"
						:aria-label="i18n.baseText('publishJudge.create.scope.label')"
						data-test-id="publish-judge-create-scope"
					>
						<template #prefix>
							<N8nIcon
								v-if="selectedScope.icon.type === 'icon'"
								:icon="selectedScope.icon.value"
								color="text-dark"
							/>
							<N8nText v-else color="text-light">{{ selectedScope.icon.value }}</N8nText>
						</template>
						<N8nOption
							v-for="option in scopeOptions"
							:key="option.id"
							:value="option.id"
							:label="option.name"
						>
							<div :class="$style.scopeOption">
								<span :class="$style.scopeIcon">
									<N8nIcon
										v-if="option.icon.type === 'icon'"
										:icon="option.icon.value"
										color="text-base"
									/>
									<N8nText v-else color="text-light">{{ option.icon.value }}</N8nText>
								</span>
								<span :class="$style.scopeText">
									<span :class="$style.scopeName">{{ option.name }}</span>
									<small :class="$style.scopeHint">{{ option.hint }}</small>
								</span>
							</div>
						</N8nOption>
					</N8nSelect>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('publishJudge.type.label')"
					size="small"
					color="text-dark"
				>
					<N8nSegmentControl
						v-model="judgeType"
						:options="typeOptions"
						data-test-id="publish-judge-create-type"
					/>
				</N8nInputLabel>
			</div>
			<div v-for="group in JUDGE_RULE_GROUPS" :key="group.id" :class="$style.group">
				<N8nText tag="div" size="small" bold>{{ i18n.baseText(group.title) }}</N8nText>
				<N8nText tag="div" size="xsmall" color="text-light">
					{{ i18n.baseText(group.hint) }}
				</N8nText>
				<div :class="$style.suggestions">
					<button
						v-for="suggestion in group.suggestions"
						:key="suggestion.id"
						type="button"
						:class="[$style.suggestion, { [$style.selected]: isSelected(suggestion) }]"
						:aria-pressed="isSelected(suggestion)"
						:data-test-id="`publish-judge-suggestion-${suggestion.id}`"
						@click="toggle(suggestion)"
					>
						<N8nText tag="span" size="small" bold>{{ i18n.baseText(suggestion.title) }}</N8nText>
						<N8nText tag="span" size="small" color="text-light">
							{{ i18n.baseText(suggestion.rule) }}
						</N8nText>
					</button>
				</div>
			</div>
			<N8nInputLabel
				:label="i18n.baseText('publishJudge.create.rules.label')"
				input-name="publish-judge-create-rules"
				size="small"
				color="text-dark"
			>
				<N8nInput
					id="publish-judge-create-rules"
					v-model="rules"
					type="textarea"
					:rows="4"
					:placeholder="i18n.baseText('publishJudge.create.rules.placeholder')"
					data-test-id="publish-judge-create-rules"
				/>
			</N8nInputLabel>
			<N8nCallout v-if="!isAssistantReady" theme="info">
				{{ i18n.baseText('publishJudge.create.noAssistant') }}
			</N8nCallout>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="outline" :label="i18n.baseText('generic.cancel')" @click="open = false" />
			<N8nButton
				v-if="!isAssistantReady"
				:label="i18n.baseText('publishJudge.create.copy')"
				:disabled="!hasRules"
				data-test-id="publish-judge-create-copy"
				@click="copyRequest"
			/>
			<N8nButton
				v-else
				:label="i18n.baseText('publishJudge.create.start')"
				:disabled="!hasRules"
				:loading="isStarting"
				data-test-id="publish-judge-create-start"
				@click="start"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: var(--spacing--sm);
	align-items: end;
}

/* The option row of the project picker: a round icon, then a name over a hint. */
.scopePopper :global(.el-select-dropdown__item) {
	height: auto;
}

.scopeOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) 0;
}

.scopeIcon {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	border-radius: 50%;
}

.scopeText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.scopeName {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	color: var(--color--text--shade-1);
}

.scopeHint {
	font-size: var(--font-size--xs);
	line-height: var(--line-height--lg);
	color: var(--color--text--tint-1);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.suggestions {
	margin-top: var(--spacing--3xs);
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing--2xs);
}

.suggestion {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	text-align: left;
	cursor: pointer;
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);

	&:hover {
		border-color: var(--color--primary);
	}
}

.selected {
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);
}
</style>
