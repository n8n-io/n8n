<script setup lang="ts">
import type { PromotionDependencyReport } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useCredentialTypeNames } from '../../composables/useCredentialTypeNames';
import { usePromotionDependencyLabels } from '../../composables/usePromotionDependencyLabels';
import { placeholderGaps, type ApplyConfirmations } from '../../promotionDependencies';
import type { ResourceKey } from '../../promotionPreview.selection';
import PromotionWorkflowLinks from '../preview/PromotionWorkflowLinks.vue';
import PromotionDependencySection from './PromotionDependencySection.vue';
import PromotionDependencyTarget from './PromotionDependencyTarget.vue';

/**
 * The parts of the dependency report that only an Apply has: what it grants, moves, keeps,
 * deletes and creates for the dependencies, and the confirmations that it needs for them.
 */
const props = defineProps<{
	report: PromotionDependencyReport;
	confirmations: ApplyConfirmations;
	/** True while the operation runs. */
	locked?: boolean;
	/** The names of the projects that the user can access, by id. */
	projectNames: ReadonlyMap<string, string>;
	/** The deleted workflows that the user can take out of the selection, by id. */
	removableDeletions: ReadonlySet<string>;
}>();

const emit = defineEmits<{
	grant: [id: string, accepted: boolean];
	deletionCallers: [accepted: boolean];
	credentialHome: [credentialId: string, projectId: string];
	keep: [workflowId: string];
	inspect: [key: ResourceKey];
}>();

const i18n = useI18n();
const { credentialTypeName } = useCredentialTypeNames();
const { credentialNotMovedText } = usePromotionDependencyLabels();
const hiddenKept = computed(() => props.report.hiddenKeptWorkflowCount ?? 0);
const keptProjects = computed(() => props.report.keptProjects ?? []);
const hiddenKeptProjects = computed(() => props.report.hiddenKeptProjectCount ?? 0);

const workflowLinks = (workflows: ReadonlyArray<{ id: string; name: string }>) =>
	workflows.map(({ id, name }) => ({ key: `workflow:${id}`, name }));

// A placeholder exists only after an incomplete Apply, so a strict environment shows none.
const placeholders = computed(() =>
	props.report.allowIncomplete
		? placeholderGaps(props.report.gaps).map((gap) => ({
				id: gap.target.id,
				target: gap.target,
				project: props.projectNames.get(gap.consumer.projectId),
				consumer: gap.consumer.name,
			}))
		: [],
);
</script>

<template>
	<div :class="$style.sections">
		<PromotionDependencySection
			v-if="report.credentialHomeChoices.length > 0"
			:title="i18n.baseText('promotions.dependencies.homes.title')"
			:description="i18n.baseText('promotions.dependencies.homes.description')"
			data-test-id="promotion-dependency-homes"
		>
			<li
				v-for="{ credential, candidateProjects } in report.credentialHomeChoices"
				:key="credential.id"
				:class="$style.row"
			>
				<PromotionDependencyTarget
					:target="{
						kind: 'credential',
						id: credential.id,
						name: credential.name,
						credentialType: credential.type,
					}"
				/>
				<N8nSelect
					:model-value="confirmations.credentialHomes[credential.id] ?? ''"
					size="small"
					:disabled="locked"
					:placeholder="i18n.baseText('promotions.dependencies.homes.placeholder')"
					:aria-label="
						i18n.baseText('promotions.dependencies.homes.label', {
							interpolate: { credential: credential.name },
						})
					"
					:class="$style.select"
					data-test-id="promotion-dependency-home-select"
					@update:model-value="emit('credentialHome', credential.id, String($event))"
				>
					<N8nOption
						v-for="project in candidateProjects"
						:key="project.id"
						:value="project.id"
						:label="project.name"
					/>
				</N8nSelect>
			</li>
		</PromotionDependencySection>

		<PromotionDependencySection
			v-if="report.grants.length > 0"
			:title="i18n.baseText('promotions.dependencies.grants.title')"
			:description="i18n.baseText('promotions.dependencies.grants.description')"
			data-test-id="promotion-dependency-grants"
		>
			<li v-for="grant in report.grants" :key="grant.id" :class="$style.row">
				<div :class="$style.main">
					<N8nCheckbox
						:model-value="confirmations.grantIds.has(grant.id)"
						:disabled="locked"
						:label="
							i18n.baseText('promotions.dependencies.grants.label', {
								interpolate: { project: grant.project.name, credential: grant.credential.name },
							})
						"
						data-test-id="promotion-dependency-grant"
						@update:model-value="emit('grant', grant.id, $event === true)"
					/>
					<N8nText tag="p" step="2xs" color="text-light" :class="$style.indented">
						{{ i18n.baseText('promotions.dependencies.usage.credential') }}
						<PromotionWorkflowLinks
							:workflows="workflowLinks(grant.consumers)"
							@inspect="emit('inspect', $event)"
						/>
					</N8nText>
				</div>
				<N8nText step="2xs" color="text-light">
					{{ credentialTypeName(grant.credential.type) }}
				</N8nText>
			</li>
		</PromotionDependencySection>

		<PromotionDependencySection
			v-if="report.deletionCallers.length > 0"
			:title="i18n.baseText('promotions.dependencies.deletions.title')"
			:description="i18n.baseText('promotions.dependencies.deletions.description')"
			data-test-id="promotion-dependency-deletions"
		>
			<li
				v-for="{ target, callers, hiddenCallerCount } in report.deletionCallers"
				:key="target.id"
				:class="$style.row"
			>
				<div :class="$style.main">
					<PromotionDependencyTarget
						:target="{ kind: 'workflow', id: target.id, name: target.name }"
					/>
					<ul v-if="callers.length > 0" :class="[$style.callers, $style.indented]" role="list">
						<li v-for="caller in callers" :key="caller.id">
							<N8nText step="2xs" color="text-base">
								{{
									i18n.baseText('promotions.dependencies.deletions.caller', {
										interpolate: { workflow: caller.name },
									})
								}}
								<template v-if="projectNames.get(caller.projectId)">
									{{
										i18n.baseText('promotions.dependencies.target.inProject', {
											interpolate: { project: projectNames.get(caller.projectId) ?? '' },
										})
									}}
								</template>
							</N8nText>
							<N8nBadge v-if="caller.publishedOnly" variant="subtle">
								{{ i18n.baseText('promotions.dependencies.deletions.publishedOnly') }}
							</N8nBadge>
						</li>
					</ul>
					<N8nText
						v-if="hiddenCallerCount > 0"
						tag="p"
						step="2xs"
						color="text-base"
						:class="$style.indented"
						data-test-id="promotion-dependency-hidden-callers"
					>
						{{
							i18n.baseText('promotions.dependencies.deletions.hidden', {
								adjustToNumber: hiddenCallerCount,
								interpolate: { count: String(hiddenCallerCount) },
							})
						}}
					</N8nText>
				</div>
				<N8nButton
					v-if="removableDeletions.has(target.id)"
					variant="outline"
					size="small"
					:disabled="locked"
					data-test-id="promotion-dependency-keep"
					@click="emit('keep', target.id)"
				>
					{{ i18n.baseText('promotions.dependencies.deletions.keep') }}
				</N8nButton>
			</li>
			<li :class="[$style.row, $style.accept]">
				<N8nCheckbox
					:model-value="confirmations.deletionCallers"
					:disabled="locked"
					:label="
						i18n.baseText('promotions.dependencies.deletions.accept', {
							adjustToNumber: report.deletionCallers.length,
						})
					"
					data-test-id="promotion-dependency-accept-deletions"
					@update:model-value="emit('deletionCallers', $event === true)"
				/>
			</li>
		</PromotionDependencySection>

		<PromotionDependencySection
			v-if="report.credentialMoves.length > 0"
			:title="i18n.baseText('promotions.dependencies.moves.title')"
			:description="i18n.baseText('promotions.dependencies.moves.description')"
			tone="quiet"
			data-test-id="promotion-dependency-moves"
		>
			<li
				v-for="move in report.credentialMoves"
				:key="move.credential.id"
				:class="$style.row"
				data-test-id="promotion-dependency-move"
			>
				<div :class="$style.main">
					<N8nText step="xs" color="text-dark" :class="$style.sentence">
						<N8nIcon
							:icon="move.allowed ? 'key-round' : 'circle-alert'"
							size="small"
							:class="move.allowed ? $style.icon : $style.warningIcon"
						/>
						<span>
							{{
								move.allowed
									? i18n.baseText('promotions.dependencies.moves.allowed', {
											interpolate: {
												credential: move.credential.name,
												project: move.toProject.name,
											},
										})
									: credentialNotMovedText(move)
							}}
						</span>
					</N8nText>
					<N8nText
						v-if="move.fromProject"
						tag="p"
						step="2xs"
						color="text-light"
						:class="$style.indented"
					>
						{{
							i18n.baseText('promotions.dependencies.moves.from', {
								interpolate: { project: move.fromProject.name },
							})
						}}
					</N8nText>
				</div>
				<N8nBadge v-if="move.placeholder" variant="subtle">
					{{ i18n.baseText('promotions.dependencies.placeholder.badge') }}
				</N8nBadge>
			</li>
		</PromotionDependencySection>

		<PromotionDependencySection
			v-if="report.keptWorkflows.length > 0 || hiddenKept > 0"
			:title="i18n.baseText('promotions.dependencies.kept.title')"
			:description="i18n.baseText('promotions.dependencies.kept.description')"
			tone="quiet"
			data-test-id="promotion-dependency-kept"
		>
			<li v-for="workflow in report.keptWorkflows" :key="workflow.id" :class="$style.row">
				<div :class="$style.main">
					<PromotionDependencyTarget
						:target="{
							kind: 'workflow',
							id: workflow.id,
							name: workflow.name,
							project: projectNames.has(workflow.projectId)
								? { id: workflow.projectId, name: projectNames.get(workflow.projectId) ?? '' }
								: undefined,
						}"
					/>
					<N8nText tag="p" step="2xs" color="text-light" :class="$style.indented">
						{{ i18n.baseText('promotions.dependencies.usage.sub-workflow') }}
						<PromotionWorkflowLinks
							:workflows="workflowLinks(workflow.referencedBy)"
							@inspect="emit('inspect', $event)"
						/>
					</N8nText>
				</div>
			</li>
			<li v-if="hiddenKept > 0" :class="$style.row" data-test-id="promotion-dependency-kept-hidden">
				<N8nText step="2xs" color="text-base">
					{{
						i18n.baseText('promotions.dependencies.kept.hidden', {
							adjustToNumber: hiddenKept,
							interpolate: { count: String(hiddenKept) },
						})
					}}
				</N8nText>
			</li>
		</PromotionDependencySection>

		<PromotionDependencySection
			v-if="keptProjects.length > 0 || hiddenKeptProjects > 0"
			:title="i18n.baseText('promotions.dependencies.keptProjects.title')"
			:description="i18n.baseText('promotions.dependencies.keptProjects.description')"
			tone="quiet"
			data-test-id="promotion-dependency-kept-projects"
		>
			<li v-for="kept in keptProjects" :key="kept.project.id" :class="$style.row">
				<N8nText step="xs" color="text-dark">
					{{
						i18n.baseText('promotions.dependencies.keptProjects.row', {
							interpolate: {
								project: kept.project.name,
								credentials: kept.credentials.map(({ name }) => name).join(', '),
							},
						})
					}}
				</N8nText>
			</li>
			<li v-if="hiddenKeptProjects > 0" :class="$style.row">
				<N8nText step="2xs" color="text-base">
					{{
						i18n.baseText('promotions.dependencies.keptProjects.hidden', {
							adjustToNumber: hiddenKeptProjects,
							interpolate: { count: String(hiddenKeptProjects) },
						})
					}}
				</N8nText>
			</li>
		</PromotionDependencySection>

		<PromotionDependencySection
			v-if="placeholders.length > 0"
			:title="i18n.baseText('promotions.dependencies.placeholders.title')"
			:description="i18n.baseText('promotions.dependencies.placeholders.description')"
			tone="quiet"
			data-test-id="promotion-dependency-placeholders"
		>
			<li v-for="placeholder in placeholders" :key="placeholder.id" :class="$style.row">
				<N8nText step="xs" color="text-dark" :class="$style.sentence">
					<N8nIcon icon="key-round" size="small" :class="$style.icon" />
					<span>
						{{
							placeholder.project
								? i18n.baseText('promotions.dependencies.placeholders.inProject', {
										interpolate: {
											credential: placeholder.target.name ?? placeholder.id,
											project: placeholder.project,
										},
									})
								: i18n.baseText('promotions.dependencies.placeholders.forWorkflow', {
										interpolate: {
											credential: placeholder.target.name ?? placeholder.id,
											workflow: placeholder.consumer,
										},
									})
						}}
					</span>
				</N8nText>
			</li>
		</PromotionDependencySection>
	</div>
</template>

<style module lang="scss">
.sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);

	&:not(:first-child) {
		border-top: var(--border);
	}
}

.accept {
	background-color: var(--background--subtle);
}

.main {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.indented {
	margin: 0;
	padding-left: calc(var(--spacing--xs) + var(--spacing--2xs));
}

.callers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	list-style: none;

	li {
		display: flex;
		align-items: center;
		gap: var(--spacing--2xs);
	}
}

.select {
	flex-shrink: 0;
	width: var(--spacing--5xl);
}

.sentence {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.icon,
.warningIcon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
}

.icon {
	color: var(--icon-color);
}

.warningIcon {
	color: var(--text-color--warning);
}
</style>
