<script lang="ts" setup>
import {
	SKILL_SOURCE_REASONS,
	type DiscoveredSkill,
	type SkillSourceConnectResponse,
	type SkillSourceDiscovery,
	type SkillSourceReason,
} from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { ResponseError } from '@n8n/rest-api-client';

import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';

import { useSkillsStore } from '../skills.store';
import { parseScope } from '../skills.utils';

/** What the page needs to confirm an import: the answer, and the names it shows in the toast. */
export type SkillSourceConnected = {
	response: SkillSourceConnectResponse;
	sourceLabel: string;
	scopeLabel: string;
};

const props = defineProps<{
	open: boolean;
	/** The scopes where the user may create skills, as the create modal lists them. */
	scopeOptions: AgentSkillModalScopeOption[];
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	connected: [result: SkillSourceConnected];
}>();

/** A loose check only: the server reads the link and answers with the exact reason. */
const GITHUB_LINK = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+([/?#].*)?$/i;

const i18n = useI18n();
const { showError } = useToast();
const skillsStore = useSkillsStore();

const step = ref<'link' | 'choose'>('link');
const url = ref('');
const scope = ref('');
const discovering = ref(false);
const connecting = ref(false);
const linkError = ref('');
const discovery = ref<SkillSourceDiscovery | null>(null);
const selected = ref<string[]>([]);
/** Counts the reads of a link, so the answer of a read from before a close is dropped. */
let discoverRun = 0;

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		discoverRun += 1;
		discovering.value = false;
		step.value = 'link';
		url.value = '';
		scope.value = props.scopeOptions[0]?.value ?? '';
		linkError.value = '';
		discovery.value = null;
		selected.value = [];
	},
	{ immediate: true },
);

// A new link or scope needs a new read, so the old answer and its messages go.
watch([url, scope], () => {
	linkError.value = '';
	discovery.value = null;
});

const selectedScope = computed(() =>
	props.scopeOptions.find((option) => option.value === scope.value),
);

const scopeHint = computed(() => {
	const option = selectedScope.value;
	if (!option || option.value === 'instance') {
		return i18n.baseText('settings.context.skills.connect.scope.hint.instance');
	}
	if (option.icon === 'user') {
		return i18n.baseText('settings.context.skills.connect.scope.hint.personal');
	}
	return i18n.baseText('settings.context.skills.connect.scope.hint.project', {
		interpolate: { project: option.label },
	});
});

function reasonOf(error: ResponseError): SkillSourceReason | undefined {
	const reason = error.meta?.reason;
	return SKILL_SOURCE_REASONS.find((known) => known === reason);
}

/**
 * The prototype has its own text for a bad link and a missing repository. Other reasons say
 * what the server said; an error without a reason gets the generic text.
 */
function discoverErrorText(error: unknown): string {
	if (!(error instanceof ResponseError)) {
		return i18n.baseText('settings.context.skills.connect.error.discover');
	}
	const reason = reasonOf(error);
	if (reason === 'invalid_url') {
		return i18n.baseText('settings.context.skills.connect.error.invalidUrl');
	}
	if (reason === 'not_found') {
		return i18n.baseText('settings.context.skills.connect.error.notFound');
	}
	// Without a reason the error is not about the link, such as a 404 when skill sync is off.
	if (!reason || !error.message) {
		return i18n.baseText('settings.context.skills.connect.error.discover');
	}
	return error.message;
}

const duplicate = computed(() => discovery.value?.duplicate ?? { kind: 'none' as const });

const duplicateMessage = computed(() => {
	const dup = duplicate.value;
	const repo = discovery.value?.source.label ?? '';
	if (dup.kind === 'blocked') {
		return dup.where === 'global'
			? i18n.baseText('settings.context.skills.connect.duplicate.global', {
					interpolate: { repo },
				})
			: i18n.baseText('settings.context.skills.connect.duplicate.scope', {
					interpolate: { repo, scope: selectedScope.value?.label ?? '' },
				});
	}
	if (dup.kind === 'warning') {
		return i18n.baseText('settings.context.skills.connect.duplicate.warning', {
			interpolate: { repo, projects: dup.projects.map((project) => project.name).join(', ') },
		});
	}
	return '';
});

const isBlocked = computed(() => duplicate.value.kind === 'blocked');

const canGoNext = computed(
	() => !!url.value.trim() && !!scope.value && !discovering.value && !isBlocked.value,
);

function isSelectable(skill: DiscoveredSkill): boolean {
	return !skill.nameTaken && !skill.error;
}

async function onNext() {
	const link = url.value.trim();
	if (!GITHUB_LINK.test(link)) {
		linkError.value = i18n.baseText('settings.context.skills.connect.error.invalidUrl');
		return;
	}
	const requestedScope = scope.value;
	const run = ++discoverRun;
	// The user may have changed the link or the scope, or closed the dialog, while n8n read it.
	const isCurrent = () =>
		run === discoverRun && link === url.value.trim() && requestedScope === scope.value;
	discovering.value = true;
	try {
		const result = await skillsStore.discoverSource({ url: link, ...parseScope(requestedScope) });
		if (!isCurrent()) return;
		discovery.value = result;
		if (result.duplicate.kind === 'blocked') return;
		selected.value = result.skills.filter(isSelectable).map((skill) => skill.key);
		step.value = 'choose';
	} catch (error) {
		if (isCurrent()) linkError.value = discoverErrorText(error);
	} finally {
		if (run === discoverRun) discovering.value = false;
	}
}

function onBack() {
	step.value = 'link';
}

function toggle(key: string, checked: boolean) {
	selected.value = checked
		? [...selected.value, key]
		: selected.value.filter((selectedKey) => selectedKey !== key);
}

const sourceLine = computed(() => {
	const source = discovery.value?.source;
	if (!source) return '';
	return [source.label, source.ref, source.path].filter(Boolean).join(' · ');
});

function nameTakenReason(skill: DiscoveredSkill): string {
	return i18n.baseText('settings.context.skills.connect.nameTaken.reason', {
		interpolate: { name: skill.name ?? skill.location, scope: selectedScope.value?.label ?? '' },
	});
}

/** How many skipped paths the list names before it only counts the rest. */
const SKIPPED_FILES_SHOWN = 3;

function skippedFilesText(skill: DiscoveredSkill): string {
	const count = skill.skippedFiles.length;
	const shown = skill.skippedFiles.slice(0, SKIPPED_FILES_SHOWN).join(', ');
	const files =
		count > SKIPPED_FILES_SHOWN
			? i18n.baseText('settings.context.skills.connect.skippedFiles.more', {
					interpolate: { files: shown, count: count - SKIPPED_FILES_SHOWN },
				})
			: shown;
	return i18n.baseText('settings.context.skills.connect.skippedFiles', {
		interpolate: { count, files },
		adjustToNumber: count,
	});
}

const addLabel = computed(() =>
	selected.value.length > 0
		? i18n.baseText('settings.context.skills.connect.addCount', {
				interpolate: { count: selected.value.length },
			})
		: i18n.baseText('generic.add'),
);

/** A skill that n8n could not read has no name in the answer, so it gets the name in the list. */
function withSkillName(
	failure: SkillSourceConnectResponse['failed'][number],
): SkillSourceConnectResponse['failed'][number] {
	if (failure.name) return failure;
	const skill = discovery.value?.skills.find((item) => item.key === failure.key);
	return { ...failure, name: skill ? (skill.name ?? skill.location) : null };
}

async function onAdd() {
	const source = discovery.value?.source;
	if (!source || selected.value.length === 0) return;
	connecting.value = true;
	try {
		const response = await skillsStore.connectSource({
			url: url.value.trim(),
			...parseScope(scope.value),
			skillKeys: selected.value,
		});
		emit('connected', {
			response: { ...response, failed: response.failed.map(withSkillName) },
			sourceLabel: source.label,
			scopeLabel: selectedScope.value?.label ?? '',
		});
		emit('update:open', false);
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.connect.error.connect'));
	} finally {
		connecting.value = false;
	}
}

/** The import runs on the server until it answers, so the dialog stays open until then. */
function onOpenChange(open: boolean) {
	if (!open && connecting.value) return;
	emit('update:open', open);
}

const title = computed(() =>
	step.value === 'link'
		? i18n.baseText('settings.context.skills.connect.link.title')
		: i18n.baseText('settings.context.skills.connect.choose.title'),
);
</script>

<template>
	<N8nDialog
		:open="open"
		:header="title"
		size="large"
		:disable-outside-pointer-events="true"
		data-test-id="skill-source-connect-dialog"
		@update:open="onOpenChange"
	>
		<N8nDialogBody v-if="step === 'link'" :class="$style.body">
			<div :class="$style.field">
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.connect.scope.label')"
					color="text-dark"
				>
					<N8nSelect
						v-model="scope"
						size="large"
						:teleported="false"
						data-test-id="skill-source-scope-select"
					>
						<template v-if="selectedScope" #prefix>
							<N8nIcon :icon="selectedScope.icon" />
						</template>
						<N8nOption
							v-for="option in scopeOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						>
							<div :class="$style.option">
								<N8nIcon :icon="option.icon" />
								<span>{{ option.label }}</span>
							</div>
						</N8nOption>
					</N8nSelect>
				</N8nInputLabel>
				<N8nText size="small" color="text-light" data-test-id="skill-source-scope-hint">
					{{ scopeHint }}
				</N8nText>
			</div>
			<div :class="$style.field">
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.connect.url.label')"
					color="text-dark"
				>
					<N8nInput
						v-model="url"
						size="large"
						:placeholder="i18n.baseText('settings.context.skills.connect.url.placeholder')"
						data-test-id="skill-source-url-input"
						@keydown.enter="canGoNext && onNext()"
					/>
				</N8nInputLabel>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.context.skills.connect.url.hint') }}
				</N8nText>
			</div>
			<N8nCallout v-if="linkError" theme="danger" data-test-id="skill-source-link-error">
				{{ linkError }}
			</N8nCallout>
			<N8nCallout
				v-if="duplicateMessage"
				:theme="isBlocked ? 'danger' : 'warning'"
				data-test-id="skill-source-duplicate"
			>
				{{ duplicateMessage }}
			</N8nCallout>
		</N8nDialogBody>

		<N8nDialogBody v-else-if="discovery" :class="$style.body">
			<div :class="$style.source" data-test-id="skill-source-summary">
				<N8nIcon icon="git-branch" size="small" />
				<N8nText size="small" color="text-light">{{ sourceLine }}</N8nText>
			</div>
			<N8nCallout v-if="duplicateMessage" theme="warning" data-test-id="skill-source-duplicate">
				{{ duplicateMessage }}
			</N8nCallout>
			<ul :class="$style.list" data-test-id="skill-source-skills">
				<li
					v-for="item in discovery.skills"
					:key="item.key"
					:class="[$style.item, !isSelectable(item) && $style.disabled]"
					:data-test-id="`skill-source-skill-${item.key}`"
				>
					<N8nCheckbox
						:model-value="isSelectable(item) && selected.includes(item.key)"
						:disabled="!isSelectable(item)"
						:aria-label="item.name ?? item.location"
						data-test-id="skill-source-skill-checkbox"
						@update:model-value="toggle(item.key, $event)"
					/>
					<div :class="$style.itemText">
						<N8nText bold>{{ item.name ?? item.location }}</N8nText>
						<N8nText v-if="item.description" size="small" color="text-light">
							{{ item.description }}
						</N8nText>
						<N8nText
							v-if="item.skippedFiles.length > 0"
							size="small"
							color="text-light"
							data-test-id="skill-source-skill-skipped"
						>
							{{ skippedFilesText(item) }}
						</N8nText>
						<N8nText
							v-if="item.nameTaken"
							size="small"
							color="text-light"
							data-test-id="skill-source-skill-reason"
						>
							{{ nameTakenReason(item) }}
						</N8nText>
						<N8nText
							v-else-if="item.error"
							size="small"
							color="danger"
							data-test-id="skill-source-skill-reason"
						>
							{{ item.error.message }}
						</N8nText>
					</div>
					<N8nBadge
						v-if="item.nameTaken"
						variant="subtle"
						data-test-id="skill-source-skill-name-taken"
					>
						{{ i18n.baseText('settings.context.skills.connect.nameTaken.tag') }}
					</N8nBadge>
				</li>
			</ul>
			<N8nText v-if="discovery.truncated" size="small" color="text-light">
				{{ i18n.baseText('settings.context.skills.connect.truncated') }}
			</N8nText>
			<div :class="$style.addTo">
				<N8nText size="small" bold>
					{{ i18n.baseText('settings.context.skills.connect.addTo') }}
				</N8nText>
				<N8nBadge v-if="selectedScope" variant="outline" data-test-id="skill-source-add-to">
					<template #leading>
						<N8nIcon :icon="selectedScope.icon" size="small" />
					</template>
					{{ selectedScope.label }}
				</N8nBadge>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.context.skills.connect.addTo.hint') }}
				</N8nText>
			</div>
		</N8nDialogBody>

		<N8nDialogFooter>
			<N8nButton
				v-if="step === 'choose'"
				variant="ghost"
				:label="i18n.baseText('generic.back')"
				:disabled="connecting"
				data-test-id="skill-source-back"
				@click="onBack"
			/>
			<span :class="$style.spacer" />
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="connecting"
				data-test-id="skill-source-cancel"
				@click="onOpenChange(false)"
			/>
			<N8nButton
				v-if="step === 'link'"
				:label="i18n.baseText('generic.next')"
				:disabled="!canGoNext"
				:loading="discovering"
				data-test-id="skill-source-next"
				@click="onNext"
			/>
			<N8nButton
				v-else
				:label="addLabel"
				:disabled="selected.length === 0"
				:loading="connecting"
				data-test-id="skill-source-add"
				@click="onAdd"
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

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--color--text--tint-1);
}

.list {
	display: flex;
	flex-direction: column;
	max-height: 50vh;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
	border: var(--border);
	border-radius: var(--radius);
}

.item {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.disabled {
	opacity: 0.7;
}

.itemText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.addTo {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.spacer {
	flex: 1;
}
</style>
