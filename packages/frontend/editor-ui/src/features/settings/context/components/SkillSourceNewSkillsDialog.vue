<script setup lang="ts">
import type { DiscoveredSkill, SkillNewUpdate, SkillSourceListItem } from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';

import SkillScopeBadge from './SkillScopeBadge.vue';
import SkillSourceDialogHeader from './SkillSourceDialogHeader.vue';
import SkillSourceFilesView from './SkillSourceFilesView.vue';
import SkillSourceReview from './SkillSourceReview.vue';
import { useSkillsStore } from '@/features/settings/context/skills.store';
import {
	isSelectableSkill,
	sourceLineOf,
} from '@/features/settings/context/skillSourceReview.utils';
import { useSkillSourceReasons } from '@/features/settings/context/skills.utils';

/** The review step of "Import skills", for the new skills of a source that is connected. */
const props = defineProps<{ source: SkillSourceListItem }>();
const emit = defineEmits<{ close: []; changed: [] }>();

const i18n = useI18n();
const store = useSkillsStore();
const { showMessage } = useToast();
const { reasonText } = useSkillSourceReasons();

const skills = ref<SkillNewUpdate[]>([]);
/**
 * The skills that are out of the "N new" count. They are apart from `skills`, so the review
 * keeps its tab and its search when the user takes a skill out of the count.
 */
const hiddenKeys = ref<string[]>([]);
const selected = ref<string[]>([]);
/** "I have reviewed the warnings", for the picked skills that need review. */
const reviewed = ref(false);
const loading = ref(true);
const saving = ref(false);
const hiding = ref(false);
const error = ref('');
const previewKey = ref<string | null>(null);
/** Counts the reads, so the answer of a read from before a reload or a close is dropped. */
let listRequest = 0;
let closed = false;

/** A new skill without a check result stays blocked, as n8n did not check it. */
const importable = (skill: SkillNewUpdate) =>
	props.source.canImport && !!skill.check && isSelectableSkill(skill);

const discovery = computed(() => ({
	skills: skills.value.map(
		(skill): DiscoveredSkill => ({
			...skill,
			check: skill.check ?? { verdict: 'blocked', findings: [] },
		}),
	),
	truncated: false,
}));
/** Without the permission to import, the user can still read each skill. */
const disabledKeys = computed(() =>
	props.source.canImport ? [] : skills.value.map(({ key }) => key),
);
const selectedSkills = computed(() =>
	skills.value.filter((skill) => selected.value.includes(skill.key) && importable(skill)),
);
const needsReview = computed(() =>
	selectedSkills.value.some((skill) => skill.check?.verdict === 'needs_review'),
);
const focused = computed(() => skills.value.find((skill) => skill.key === previewKey.value));
const focusedHidden = computed(
	() => !!focused.value && hiddenKeys.value.includes(focused.value.key),
);

const sourceLine = computed(() => sourceLineOf(props.source));
const scopeLabel = computed(
	() => props.source.projectName ?? i18n.baseText('settings.context.skills.scope.instance'),
);
const scopeSkill = computed(() => ({
	scope: props.source.projectId ? ('project' as const) : ('instance' as const),
	projectId: props.source.projectId,
	projectName: props.source.projectName,
	projectType: props.source.projectType,
	projectIcon: props.source.projectIcon,
}));

/** The import button names the scope, as in the import of a new source. */
const importLabel = computed(() => {
	const count = selectedSkills.value.length;
	return props.source.projectId
		? i18n.baseText('settings.context.skills.connect.importProject', {
				interpolate: { count, project: scopeLabel.value },
				adjustToNumber: count,
			})
		: i18n.baseText('settings.context.skills.connect.importGlobal', {
				interpolate: { count },
				adjustToNumber: count,
			});
});

function reasonOr(reason: unknown): string {
	const text = typeof reason === 'string' ? reasonText(reason) : '';
	return text || i18n.baseText('settings.context.skills.newSkills.error');
}

function errorText(cause: unknown): string {
	return reasonOr(cause instanceof ResponseError ? cause.meta?.reason : undefined);
}

async function load() {
	const request = ++listRequest;
	loading.value = true;
	reviewed.value = false;
	try {
		const result = await store.fetchSourceUpdates(props.source.id);
		if (closed || request !== listRequest) return;
		skills.value = result.newSkills ?? [];
		hiddenKeys.value = skills.value.filter(({ skipped }) => skipped).map(({ key }) => key);
		// A new skill is never ticked for the user. A reload keeps the ticks that still apply.
		selected.value = selectedSkills.value.map(({ key }) => key);
		if (result.newSkillsError) error.value = reasonOr(result.newSkillsError.reason);
	} catch (cause) {
		if (!closed && request === listRequest) error.value = errorText(cause);
	} finally {
		if (request === listRequest) loading.value = false;
	}
}

async function retry() {
	error.value = '';
	await load();
}

watch(
	selected,
	() => {
		reviewed.value = false;
	},
	{ deep: true },
);

function close() {
	if (saving.value) return;
	closed = true;
	++listRequest;
	emit('close');
}

async function onImport() {
	if (saving.value || !selectedSkills.value.length || (needsReview.value && !reviewed.value)) {
		return;
	}
	saving.value = true;
	error.value = '';
	try {
		const result = await store.acceptSourceUpdates(props.source.id, {
			updates: [],
			newSkills: selectedSkills.value.map(({ key, contentHash }) => ({ key, contentHash })),
			skippedNewSkills: [],
			reviewedWarnings: reviewed.value,
		});
		const count = result.importedCount ?? 0;
		showMessage({
			type: 'success',
			title: i18n.baseText('settings.context.skills.updates.imported', {
				interpolate: { count },
				adjustToNumber: count,
			}),
		});
		emit('changed');
		saving.value = false;
		close();
	} catch (cause) {
		error.value = errorText(cause);
		if (cause instanceof ResponseError && cause.httpStatusCode === 409) await load();
	} finally {
		saving.value = false;
	}
}

/** Takes the skill in the preview out of the "N new" count of the source. */
async function hideFromCount() {
	const skill = focused.value;
	if (!skill || saving.value) return;
	saving.value = true;
	hiding.value = true;
	error.value = '';
	try {
		await store.acceptSourceUpdates(props.source.id, {
			updates: [],
			newSkills: [],
			skippedNewSkills: [{ key: skill.key, contentHash: skill.contentHash }],
			reviewedWarnings: false,
		});
		hiddenKeys.value = [...hiddenKeys.value, skill.key];
		selected.value = selected.value.filter((key) => key !== skill.key);
		showMessage({
			type: 'success',
			title: i18n.baseText('settings.context.skills.updates.hiddenNew'),
		});
		emit('changed');
	} catch (cause) {
		error.value = errorText(cause);
		if (cause instanceof ResponseError && cause.httpStatusCode === 409) await load();
	} finally {
		saving.value = false;
		hiding.value = false;
	}
}

void load();
</script>

<template>
	<N8nDialog
		:open="true"
		size="full"
		:container-class="$style.wide"
		data-test-id="skill-source-new-skills-dialog"
		@update:open="!$event && close()"
	>
		<SkillSourceDialogHeader
			:title="i18n.baseText('settings.context.skills.connect.title')"
			:source-line="sourceLine"
		>
			<template #trailing>
				<SkillScopeBadge :skill="scopeSkill" :label="scopeLabel" />
			</template>
		</SkillSourceDialogHeader>
		<N8nDialogBody :class="$style.body">
			<N8nCallout v-if="error" theme="warning" data-test-id="skill-new-skills-error">
				{{ error }}
				<!-- With no list to review, the only way forward is to load it again. -->
				<template v-if="!loading && !skills.length" #trailingContent>
					<N8nButton
						variant="ghost"
						size="small"
						:label="i18n.baseText('generic.retry')"
						data-test-id="skill-new-skills-retry"
						@click="retry"
					/>
				</template>
			</N8nCallout>
			<N8nText v-if="loading">{{ i18n.baseText('generic.loading') }}</N8nText>
			<SkillSourceReview
				v-else-if="skills.length"
				v-model:selected="selected"
				:discovery="discovery"
				:scope-label="scopeLabel"
				:disabled="saving"
				:disabled-skill-keys="disabledKeys"
				@preview="previewKey = $event"
			>
				<template #preview="{ skill }">
					<SkillSourceFilesView :key="skill.key" :skill="skill">
						<template #footer>
							<div :class="$style.detailActions">
								<N8nText v-if="!source.canImport" size="small" color="text-light">{{
									i18n.baseText('settings.context.skills.updates.importNotAllowed')
								}}</N8nText>
								<N8nText size="small" color="text-light">{{
									i18n.baseText('settings.context.skills.updates.newHint')
								}}</N8nText>
								<N8nButton
									variant="ghost"
									:loading="hiding"
									:disabled="saving || focusedHidden"
									:label="
										i18n.baseText(
											focusedHidden
												? 'settings.context.skills.updates.hiddenNew'
												: 'settings.context.skills.updates.hideNew',
										)
									"
									data-test-id="skill-new-hide"
									data-attr="skill-new-hide"
									@click="hideFromCount"
								/>
							</div>
						</template>
					</SkillSourceFilesView>
				</template>
			</SkillSourceReview>
			<N8nText v-else-if="!error">{{
				i18n.baseText('settings.context.skills.newSkills.empty')
			}}</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter :class="$style.footer">
			<N8nCheckbox
				v-if="needsReview"
				v-model="reviewed"
				:disabled="saving"
				:label="i18n.baseText('settings.context.skills.connect.check.reviewed')"
				data-test-id="skill-new-skills-reviewed-warnings"
			/>
			<N8nButton
				variant="outline"
				:disabled="saving"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="skill-new-skills-cancel"
				@click="close"
			/>
			<N8nButton
				:loading="saving && !hiding"
				:disabled="loading || saving || selectedSkills.length === 0 || (needsReview && !reviewed)"
				:label="importLabel"
				data-test-id="skill-new-skills-import"
				data-attr="skill-new-skills-import"
				@click="onImport"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.footer {
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
}

.detailActions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	align-items: flex-start;
	padding-top: var(--spacing--xs);
	border-top: var(--border);
}

/* The review shows the skill list and the files side by side. */
.wide {
	--dialog--max-width: min(1200px, calc(100dvw - var(--spacing--lg)));
}
</style>
