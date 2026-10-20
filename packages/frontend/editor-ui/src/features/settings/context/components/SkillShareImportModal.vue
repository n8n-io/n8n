<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SkillCheckLevel, SkillCheckResult, SkillDetail } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentModal from '@/features/agents/components/modals/AgentModal.vue';
import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';
import { isSkillNameTakenError } from '@/features/agents/utils/agentSkill';

import { useSkillsStore } from '../skills.store';
import {
	decryptPayload,
	fetchFromRelay,
	SkillShareError,
	type SkillSharePayload,
} from '../skillShare';
import { checkBadgeVariant } from '../skillsGitHub.utils';

const props = defineProps<{
	open: boolean;
	share: { id: string; key: string } | null;
	scopeOptions: AgentSkillModalScopeOption[];
	resolveScope: (value: string) => { scope: 'project' | 'instance'; projectId?: string };
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	imported: [skill: SkillDetail];
}>();

const i18n = useI18n();
const skillsStore = useSkillsStore();

const loading = ref(false);
const busy = ref(false);
const loadError = ref('');
const submitError = ref('');
const payload = ref<SkillSharePayload | null>(null);
const check = ref<SkillCheckResult | null>(null);
const scopeValue = ref('');
const acknowledged = ref(false);
const showPreview = ref(false);

function loadErrorText(error: unknown): string {
	const reason = error instanceof SkillShareError ? error.reason : 'relay';
	const keys = {
		not_found: 'settings.context.skills.shareImport.error.notFound',
		expired: 'settings.context.skills.shareImport.error.expired',
		bad_key: 'settings.context.skills.shareImport.error.badKey',
		bad_payload: 'settings.context.skills.shareImport.error.badPayload',
		relay: 'settings.context.skills.shareImport.error.relay',
	} as const;
	return i18n.baseText(keys[reason]);
}

watch(
	() => [props.open, props.share] as const,
	async ([open, share]) => {
		if (!open || !share) return;
		payload.value = null;
		check.value = null;
		loadError.value = '';
		submitError.value = '';
		acknowledged.value = false;
		showPreview.value = false;
		scopeValue.value = props.scopeOptions[0]?.value ?? '';
		loading.value = true;
		try {
			// The browser fetches and decrypts. The key never reaches this instance's server.
			payload.value = await decryptPayload(await fetchFromRelay(share.id), share.key);
			check.value = await skillsStore.checkSkillContent(payload.value.skill);
		} catch (error) {
			loadError.value = loadErrorText(error);
		} finally {
			loading.value = false;
		}
	},
	{ immediate: true },
);

const skill = computed(() => payload.value?.skill ?? null);
const fileCount = computed(() => 1 + (skill.value?.references?.length ?? 0));
const selectedScopeIcon = computed(
	() => props.scopeOptions.find((option) => option.value === scopeValue.value)?.icon,
);
const canAdd = computed(
	() =>
		!!check.value &&
		!!scopeValue.value &&
		check.value.result !== 'blocked' &&
		(check.value.result === 'passed' || acknowledged.value),
);

function checkLabel(result: SkillCheckLevel): string {
	if (result === 'passed') return i18n.baseText('settings.context.skills.github.result.passed');
	if (result === 'review') return i18n.baseText('settings.context.skills.github.result.review');
	return i18n.baseText('settings.context.skills.github.result.blocked');
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

async function onAdd() {
	if (!payload.value || !canAdd.value) return;
	busy.value = true;
	submitError.value = '';
	try {
		const created = await skillsStore.importSharedSkill({
			...props.resolveScope(scopeValue.value),
			skill: payload.value.skill,
			acknowledgeWarnings: acknowledged.value,
		});
		emit('imported', created);
		emit('update:open', false);
	} catch (error) {
		submitError.value = isSkillNameTakenError(error)
			? i18n.baseText('settings.context.skills.shareImport.error.nameTaken')
			: error instanceof Error && error.message
				? error.message
				: i18n.baseText('settings.context.skills.shareImport.error.add');
	} finally {
		busy.value = false;
	}
}

const title = computed(() =>
	skill.value
		? i18n.baseText('settings.context.skills.shareImport.title', {
				interpolate: { name: skill.value.name },
			})
		: i18n.baseText('settings.context.skills.shareImport.titleLoading'),
);
</script>

<template>
	<AgentModal
		:open="open"
		:title="title"
		:busy="busy"
		size="large"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body" data-test-id="skill-share-import-modal">
			<N8nText v-if="loading" color="text-light">
				{{ i18n.baseText('settings.context.skills.shareImport.loading') }}
			</N8nText>

			<N8nCallout v-else-if="loadError" theme="danger" data-test-id="skill-share-import-error">
				{{ loadError }}
			</N8nCallout>

			<template v-else-if="payload && skill && check">
				<div :class="$style.source" data-test-id="skill-share-import-source">
					<span :class="$style.avatar">{{ payload.source.author.charAt(0).toUpperCase() }}</span>
					<div :class="$style.sourceText">
						<N8nText size="small">
							<strong>{{ payload.source.author }}</strong>
							{{ i18n.baseText('settings.context.skills.shareImport.sharedFrom') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('settings.context.skills.shareImport.sourceLine', {
									interpolate: {
										version: String(payload.source.version),
										date: formatDate(payload.source.sharedAt),
									},
								})
							}}
						</N8nText>
					</div>
					<N8nBadge
						:variant="checkBadgeVariant(check.result)"
						data-test-id="skill-share-import-check"
					>
						{{ checkLabel(check.result) }}
					</N8nBadge>
				</div>

				<N8nText size="small" color="text-light">{{ skill.description }}</N8nText>

				<ul v-if="check.findings.length" :class="$style.findings">
					<li v-for="(finding, index) in check.findings" :key="index">
						<N8nText size="small">
							<strong>{{ finding.message }}.</strong>
							{{ [finding.file, finding.detail].filter(Boolean).join(': ') }}
						</N8nText>
					</li>
				</ul>
				<N8nCallout v-if="check.result === 'blocked'" theme="danger">
					{{ i18n.baseText('settings.context.skills.shareImport.blocked') }}
				</N8nCallout>

				<div :class="$style.preview">
					<button
						type="button"
						:class="$style.previewToggle"
						data-test-id="skill-share-import-preview-toggle"
						@click="showPreview = !showPreview"
					>
						<N8nIcon :icon="showPreview ? 'chevron-down' : 'chevron-right'" size="small" />
						{{
							i18n.baseText('settings.context.skills.shareImport.preview', {
								interpolate: { count: String(fileCount) },
								adjustToNumber: fileCount,
							})
						}}
					</button>
					<div v-if="showPreview" :class="$style.previewBody">
						<N8nText size="small" bold :class="$style.mono">SKILL.md</N8nText>
						<pre :class="$style.code">{{ skill.instructions }}</pre>
						<template v-for="reference in skill.references ?? []" :key="reference.path">
							<N8nText size="small" bold :class="$style.mono">{{ reference.path }}</N8nText>
							<pre :class="$style.code">{{ reference.content }}</pre>
						</template>
					</div>
				</div>

				<N8nInputLabel
					v-if="check.result !== 'blocked'"
					:label="i18n.baseText('settings.context.skills.modal.scope.label')"
					size="small"
				>
					<N8nSelect
						v-model="scopeValue"
						size="large"
						:teleported="false"
						data-test-id="skill-share-import-scope"
					>
						<template v-if="selectedScopeIcon" #prefix>
							<N8nIcon :icon="selectedScopeIcon" />
						</template>
						<N8nOption
							v-for="option in scopeOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</N8nInputLabel>

				<N8nCheckbox
					v-if="check.result === 'review'"
					v-model="acknowledged"
					:label="i18n.baseText('settings.context.skills.github.ack')"
					data-test-id="skill-share-import-ack"
				/>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.context.skills.shareImport.copyNote') }}
				</N8nText>
				<N8nCallout
					v-if="submitError"
					theme="danger"
					data-test-id="skill-share-import-submit-error"
				>
					{{ submitError }}
				</N8nCallout>
			</template>
		</div>

		<template #footerActions>
			<N8nButton
				variant="solid"
				:loading="busy"
				:disabled="!canAdd"
				data-test-id="skill-share-import-submit"
				@click="onAdd"
			>
				{{ i18n.baseText('settings.context.skills.shareImport.submit') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.avatar {
	display: grid;
	place-items: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: 50%;
	background-color: var(--color--primary);
	color: var(--color--foreground--tint-2);
	font-weight: var(--font-weight--bold);
	flex: none;
}

.sourceText {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.findings {
	margin: 0;
	padding-left: var(--spacing--md);
}

.preview {
	border: var(--border);
	border-radius: var(--radius);
}

.previewToggle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: none;
	background: none;
	color: var(--color--text);
	font-size: var(--font-size--sm);
	cursor: pointer;
	text-align: left;
}

.previewBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}

.mono {
	font-family: var(--font-family--monospace);
}

.code {
	margin: 0 0 var(--spacing--2xs);
	max-height: 12rem;
	overflow: auto;
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
</style>
