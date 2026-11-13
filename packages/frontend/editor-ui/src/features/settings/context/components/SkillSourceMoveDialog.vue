<script setup lang="ts">
import {
	skillSourceMovePreviewSchema,
	type MoveSkillSourceDto,
	type SkillSourceCredentialOption,
	type SkillSourceListItem,
	type SkillListItem,
	type SkillSourceMovePreview,
} from '@n8n/api-types';
import { computed, ref, useId, watch } from 'vue';
import { ResponseError } from '@n8n/rest-api-client';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nSelect2,
	N8nText,
} from '@n8n/design-system';

import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';
import { useSkillsStore } from '../skills.store';
import SkillScopeBadge from './SkillScopeBadge.vue';
import { parseScope, PROJECT_SCOPE_PREFIX } from '../skills.utils';

const props = defineProps<{
	open: boolean;
	source: SkillSourceListItem;
	scopeOptions: AgentSkillModalScopeOption[];
}>();
const emit = defineEmits<{ 'update:open': [open: boolean]; moved: [sourceId: string] }>();
const i18n = useI18n();
const router = useRouter();
const skillsStore = useSkillsStore();
const scope = ref('');
const credentialId = ref('');
const credentials = ref<SkillSourceCredentialOption[]>([]);
const preview = ref<SkillSourceMovePreview | null>(null);
const checking = ref(false);
const loadingCredentials = ref(false);
const moving = ref(false);
const error = ref('');
const credentialError = ref(false);
const previewFetch = useLatestFetch();
const credentialsFetch = useLatestFetch();
const scopeLabelId = useId();
const credentialLabelId = useId();
const NONE = '__none__';

const scopeItems = computed(() =>
	props.scopeOptions.filter(
		(option) =>
			option.value !==
			(props.source.projectId ? `${PROJECT_SCOPE_PREFIX}${props.source.projectId}` : 'instance'),
	),
);
const destinationLabel = computed(
	() => scopeItems.value.find(({ value }) => value === scope.value)?.label ?? scope.value,
);
const currentScope = computed<
	Pick<SkillListItem, 'scope' | 'projectId' | 'projectName' | 'projectType' | 'projectIcon'>
>(() => ({
	scope: props.source.projectId ? 'project' : 'instance',
	projectId: props.source.projectId,
	projectName: props.source.projectName,
	projectType: props.source.projectType,
	projectIcon: props.source.projectIcon,
}));
const credentialItems = computed(() => [
	{ value: NONE, label: i18n.baseText('settings.context.skills.moveSource.credential.none') },
	...credentials.value.map(({ id, name }) => ({ value: id, label: name })),
]);
const canMove = computed(
	() => !!scope.value && preview.value?.canMove && !checking.value && !moving.value,
);

function payload(): MoveSkillSourceDto {
	return {
		...parseScope(scope.value),
		fromProjectId: props.source.projectId,
		...(credentialId.value ? { credentialId: credentialId.value } : {}),
	};
}

async function validate() {
	const isLatest = previewFetch.next();
	preview.value = null;
	if (!props.open || !scope.value) {
		checking.value = false;
		return;
	}
	checking.value = true;
	error.value = '';
	try {
		const result = await skillsStore.previewSourceMove(props.source.id, payload());
		if (isLatest() && props.open) preview.value = result;
	} catch (cause) {
		if (isLatest() && props.open)
			error.value =
				cause instanceof Error
					? cause.message
					: i18n.baseText('settings.context.skills.moveSource.error');
	} finally {
		if (isLatest()) checking.value = false;
	}
}

async function loadCredentials() {
	const isLatest = credentialsFetch.next();
	if (!props.open || !scope.value) {
		loadingCredentials.value = false;
		return;
	}
	loadingCredentials.value = true;
	credentialError.value = false;
	try {
		const result = await skillsStore.fetchSourceCredentials(parseScope(scope.value));
		if (isLatest() && props.open) credentials.value = result;
	} catch {
		if (isLatest() && props.open) credentialError.value = true;
	} finally {
		if (isLatest()) loadingCredentials.value = false;
	}
}

watch(
	() => [props.open, props.source.id],
	() => {
		previewFetch.invalidate();
		credentialsFetch.invalidate();
		scope.value = '';
		credentialId.value = '';
		preview.value = null;
		credentials.value = [];
		error.value = '';
		credentialError.value = false;
		checking.value = false;
		loadingCredentials.value = false;
	},
	{ immediate: true },
);

watch(scope, () => {
	credentialId.value = '';
	credentials.value = [];
	void loadCredentials();
});
watch([scope, credentialId], () => {
	void validate();
});

function recheck() {
	if (!props.open || moving.value) return;
	void loadCredentials();
	void validate();
}
useEventListener(window, 'focus', recheck);

function skillHref(skillId: string) {
	return router.resolve({ query: { skillId } }).href;
}

async function move() {
	if (!canMove.value) return;
	moving.value = true;
	error.value = '';
	try {
		await skillsStore.moveSource(props.source.id, payload());
		emit('moved', props.source.id);
		emit('update:open', false);
	} catch (cause) {
		const submitted = skillSourceMovePreviewSchema.safeParse(
			cause instanceof ResponseError ? cause.meta?.preview : undefined,
		);
		if (submitted.success) {
			previewFetch.invalidate();
			preview.value = submitted.data;
		} else {
			await validate();
		}
		if (!preview.value || preview.value.canMove) {
			error.value =
				cause instanceof Error
					? cause.message
					: i18n.baseText('settings.context.skills.moveSource.error');
		}
	} finally {
		moving.value = false;
	}
}

function focusSelect(id: string) {
	document.getElementById(id)?.focus();
}

function close(open: boolean) {
	if (!moving.value) emit('update:open', open);
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="i18n.baseText('settings.context.skills.moveSource.action')"
		size="large"
		data-test-id="skill-source-move-dialog"
		@update:open="close"
	>
		<N8nDialogBody :class="$style.body">
			<div :class="$style.sourceSummary">
				<div :class="$style.entity">
					<N8nIcon icon="git-branch" size="medium" />
					<N8nText :bold="true" :class="$style.entityName">{{ source.label }}</N8nText>
				</div>
				<div :class="$style.currentScope">
					<N8nText size="small" color="text-light">{{
						i18n.baseText('settings.context.skills.moveSource.currentScope')
					}}</N8nText>
					<SkillScopeBadge :skill="currentScope" />
				</div>
			</div>
			<N8nText size="small" color="text-light">{{
				i18n.baseText('settings.context.skills.moveSource.description')
			}}</N8nText>
			<div :class="$style.field">
				<label
					:id="scopeLabelId"
					:for="`${scopeLabelId}-select`"
					@click.prevent="focusSelect(`${scopeLabelId}-select`)"
				>
					<N8nText :bold="true">{{
						i18n.baseText('settings.context.skills.connect.scope.label')
					}}</N8nText>
				</label>
				<N8nSelect2
					:id="`${scopeLabelId}-select`"
					:aria-labelledby="scopeLabelId"
					:model-value="scope"
					@update:model-value="scope = String($event ?? '')"
					:items="scopeItems"
					:disabled="moving"
					:placeholder="i18n.baseText('settings.context.skills.moveSource.scope.placeholder')"
					data-test-id="source-move-scope"
				/>
			</div>
			<N8nText v-if="scopeItems.length === 0">{{
				i18n.baseText('settings.context.skills.moveSource.noScopes')
			}}</N8nText>
			<template v-if="scope">
				<div :class="$style.field">
					<label
						:id="credentialLabelId"
						:for="`${credentialLabelId}-select`"
						@click.prevent="focusSelect(`${credentialLabelId}-select`)"
					>
						<N8nText :bold="true">{{
							i18n.baseText('settings.context.skills.connect.credential.label')
						}}</N8nText>
					</label>
					<N8nSelect2
						:id="`${credentialLabelId}-select`"
						:aria-labelledby="credentialLabelId"
						:model-value="credentialId || NONE"
						:items="credentialItems"
						:disabled="moving || loadingCredentials"
						data-test-id="source-move-credential"
						@update:model-value="credentialId = $event === NONE ? '' : String($event ?? '')"
					/>
				</div>
				<N8nText v-if="checking" role="status">{{
					i18n.baseText('settings.context.skills.moveSource.checking')
				}}</N8nText>
				<N8nCallout v-if="credentialError" theme="danger">{{
					i18n.baseText('settings.context.skills.moveSource.credential.error')
				}}</N8nCallout>
				<div v-if="preview" aria-live="polite" :class="$style.results">
					<N8nCallout v-if="preview.credential.reason" theme="warning" icon="key-round">
						<div :class="$style.message">
							<strong>{{
								i18n.baseText('settings.context.skills.moveSource.credential.title')
							}}</strong>
							<span>{{
								i18n.baseText(
									preview.credential.reason === 'credential_missing'
										? 'settings.context.skills.moveSource.credential.required'
										: 'settings.context.skills.moveSource.credential.ineligible',
								)
							}}</span>
						</div>
					</N8nCallout>
					<N8nCallout v-if="preview.duplicate.kind === 'blocked'" theme="danger" icon="git-branch">
						<div :class="$style.message">
							<strong>{{
								i18n.baseText('settings.context.skills.moveSource.duplicateTitle')
							}}</strong>
							<span>{{
								i18n.baseText(
									preview.duplicate.where === 'global'
										? 'settings.context.skills.moveSource.duplicateGlobal'
										: 'settings.context.skills.moveSource.duplicate',
									{
										interpolate: {
											source: source.label,
											scope:
												preview.duplicate.where === 'global'
													? i18n.baseText('settings.context.skills.scope.instance')
													: destinationLabel,
										},
									},
								)
							}}</span>
						</div>
					</N8nCallout>
					<N8nCallout v-if="preview.duplicate.kind === 'warning'" theme="warning" icon="git-branch">
						<div :class="$style.message">
							<strong>{{
								i18n.baseText('settings.context.skills.moveSource.duplicateWarning')
							}}</strong>
							<div :class="$style.entities">
								<N8nBadge
									v-for="project in preview.duplicate.projects"
									:key="project.id"
									leading-icon="layers"
									>{{ project.name }}</N8nBadge
								>
							</div>
						</div>
					</N8nCallout>
					<section
						v-if="preview.nameConflicts.length"
						:class="$style.conflict"
						data-test-id="source-move-name-conflicts"
					>
						<N8nCallout theme="danger" :round-corners="false" only-bottom-border>
							<div :class="$style.message">
								<strong>{{
									i18n.baseText('settings.context.skills.moveSource.nameConflicts.title')
								}}</strong>
								<span>{{ i18n.baseText('settings.context.skills.moveSource.nameConflicts') }}</span>
							</div>
						</N8nCallout>
						<ul :class="$style.conflictList">
							<li
								v-for="(conflict, index) in preview.nameConflicts"
								:key="index"
								:class="$style.conflictRow"
							>
								<div :class="$style.conflictEntity">
									<N8nText size="small" color="text-light">{{
										i18n.baseText('settings.context.skills.moveSource.movingSkill')
									}}</N8nText>
									<div :class="$style.entity">
										<N8nIcon icon="book-open" size="small" />
										<N8nText :class="$style.entityName">{{
											conflict.moving.name ??
											i18n.baseText('settings.context.skills.moveSource.hiddenSkill')
										}}</N8nText>
									</div>
								</div>
								<div :class="$style.conflictEntity">
									<N8nText size="small" color="text-light">{{
										i18n.baseText('settings.context.skills.moveSource.existingSkill', {
											interpolate: { scope: destinationLabel },
										})
									}}</N8nText>
									<a
										v-if="conflict.existing"
										:href="skillHref(conflict.existing.id)"
										target="_blank"
										rel="noopener noreferrer"
										:class="[$style.entity, $style.skillLink]"
										data-test-id="source-move-existing-skill"
									>
										<N8nIcon icon="book-open" size="small" />
										<span :class="$style.entityName">{{ conflict.existing.name }}</span>
										<N8nIcon icon="external-link" size="small" />
									</a>
									<N8nText v-else>{{
										i18n.baseText('settings.context.skills.moveSource.hiddenSkill')
									}}</N8nText>
								</div>
							</li>
						</ul>
						<N8nText :class="$style.conflictHint" size="small" color="text-light">{{
							i18n.baseText('settings.context.skills.moveSource.syncedNames')
						}}</N8nText>
					</section>
					<section
						v-if="preview.usageConflicts.length"
						:class="$style.conflict"
						data-test-id="source-move-agent-conflicts"
					>
						<N8nCallout theme="danger" :round-corners="false" only-bottom-border>
							<div :class="$style.message">
								<strong>{{
									i18n.baseText('settings.context.skills.moveSource.agentConflicts.title')
								}}</strong>
								<span>{{
									i18n.baseText('settings.context.skills.moveSource.agentConflicts')
								}}</span>
							</div>
						</N8nCallout>
						<ul :class="$style.conflictList">
							<li
								v-for="conflict in preview.usageConflicts"
								:key="conflict.skill.id"
								:class="$style.conflictRow"
							>
								<div :class="$style.conflictEntity">
									<N8nText size="small" color="text-light">{{
										i18n.baseText('settings.context.skills.moveSource.movingSkill')
									}}</N8nText>
									<div :class="$style.entity">
										<N8nIcon icon="book-open" size="small" />
										<N8nText :class="$style.entityName">{{
											conflict.skill.name ??
											i18n.baseText('settings.context.skills.moveSource.hiddenSkill')
										}}</N8nText>
									</div>
								</div>
								<div :class="$style.conflictEntity">
									<N8nText size="small" color="text-light">{{
										i18n.baseText('settings.context.skills.moveSource.usedBy')
									}}</N8nText>
									<div :class="$style.entities">
										<N8nBadge v-for="agent in conflict.agents" :key="agent.id" leading-icon="bot">{{
											agent.name
										}}</N8nBadge>
										<N8nText v-if="conflict.hiddenAgents" size="small" color="text-light">{{
											i18n.baseText('settings.context.skills.moveSource.hiddenAgents', {
												interpolate: { count: conflict.hiddenAgents },
												adjustToNumber: conflict.hiddenAgents,
											})
										}}</N8nText>
									</div>
								</div>
							</li>
						</ul>
					</section>
				</div>
			</template>
			<N8nCallout v-if="error" theme="danger" role="alert">{{ error }}</N8nCallout>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="subtle" :disabled="moving" @click="close(false)">{{
				i18n.baseText('generic.cancel')
			}}</N8nButton>
			<N8nButton
				v-if="scope"
				variant="subtle"
				:disabled="moving || checking"
				data-test-id="source-move-recheck"
				@click="recheck"
				>{{ i18n.baseText('settings.context.skills.moveSource.recheck') }}</N8nButton
			>
			<N8nButton
				:disabled="!canMove"
				:loading="moving"
				data-test-id="source-move-submit"
				data-attr="source-move-submit"
				@click="move"
				>{{ i18n.baseText('settings.context.skills.moveSource.action') }}</N8nButton
			>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/breakpoints';

.body,
.results {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.sourceSummary,
.conflict {
	flex-shrink: 0;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	overflow: hidden;
}
.sourceSummary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
}
.currentScope,
.entity,
.entities {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}
.currentScope,
.entities {
	flex-wrap: wrap;
}
.entities > * {
	max-width: 100%;
}
.entity > svg {
	flex-shrink: 0;
}
.entityName {
	overflow-wrap: anywhere;
	min-width: 0;
}
.message,
.conflictEntity {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}
.conflictList {
	list-style: none;
	padding: 0;
	margin: 0;
}
.conflictRow {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	& + & {
		border-top: var(--border);
	}
}
.conflictEntity {
	flex: 1 1 40%;

	@include breakpoints.breakpoint('xs-only') {
		flex-basis: 100%;
	}
}
.skillLink {
	color: var(--link--color--secondary);
	text-decoration: underline;
	text-underline-offset: var(--spacing--5xs);
}
.conflictHint {
	display: block;
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}
</style>
