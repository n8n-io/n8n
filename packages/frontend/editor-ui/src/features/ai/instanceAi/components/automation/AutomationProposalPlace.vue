<script setup lang="ts">
/**
 * Where an automation proposal runs, and who can see the workflow. The `change` slot holds the
 * control that picks another place. In a linked place, the copy goes to a project there, so the
 * line names that project, not the projects that can see the workflow here. When the check of
 * the linked place failed, the line names the project of the link in words.
 */
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import { N8nBadge, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import { placeOf, sharedProjectCount } from './automationProposal';
import type { LinkedProject } from './automationTargets';
import { placeName as nameOfPlace } from './automationText';
import type { ViewedProposal } from './automationViewerLinks';

const props = defineProps<{
	proposal: ViewedProposal;
	/** The place that the answer sends. Without it, the default answer target. */
	targetId?: string;
	/**
	 * The project that the copy goes to in a linked place. Absent until the check answers, and
	 * when the copy cannot go there.
	 */
	linkedProject?: LinkedProject;
}>();

const i18n = useI18n();

const place = computed(() => placeOf(props.proposal, props.targetId));
const sharedCount = computed(() => sharedProjectCount(props.proposal));

const placeKey = computed(() =>
	place.value.reasonKey
		? 'instanceAi.automation.place.runsOnWithReason'
		: 'instanceAi.automation.place.runsOn',
);

const placeName = computed(() => nameOfPlace(place.value));

// A linked place shows its project once the check answers. Until then the line waits, because
// the projects here say nothing about who can see the copy there.
const showsVisibility = computed(() => !place.value.linked || props.linkedProject !== undefined);

const visibleToKey = computed(() => {
	if (place.value.linked) {
		return props.linkedProject?.kind === 'unknown'
			? 'instanceAi.automation.visibleToUnknownIn'
			: 'instanceAi.automation.visibleToIn';
	}
	return sharedCount.value > 0
		? 'instanceAi.automation.visibleToShared'
		: 'instanceAi.automation.visibleTo';
});

// A personal project is named "First Last <email>". The card shows only the name.
function localProjectName(): string {
	const { projectName: name, projectType } = props.proposal.visibleTo;
	if (projectType !== 'personal') return name;
	const parts = splitName(name);
	return parts.name ?? parts.email ?? name;
}

const projectName = computed(() => {
	if (!place.value.linked) return localProjectName();
	const project = props.linkedProject;
	return project?.kind === 'project'
		? project.name
		: i18n.baseText('instanceAi.automation.place.personalProject');
});

const showsOthers = computed(() => !place.value.linked && sharedCount.value > 0);

const othersText = computed(() =>
	i18n.baseText('instanceAi.automation.otherProjects', {
		adjustToNumber: sharedCount.value,
		interpolate: { count: String(sharedCount.value) },
	}),
);
</script>

<template>
	<div :class="$style.place">
		<N8nText
			tag="div"
			size="small"
			color="text-dark"
			:class="$style.line"
			data-test-id="automation-proposal-place"
		>
			<I18nT :keypath="placeKey" scope="global">
				<template #place>
					<N8nBadge variant="outline" :class="$style.chip" :title="placeName">
						{{ placeName }}
					</N8nBadge>
				</template>
				<template v-if="place.reasonKey" #reason>{{ i18n.baseText(place.reasonKey) }}</template>
			</I18nT>
			<slot name="change" />
		</N8nText>

		<N8nText
			v-if="place.caveat"
			tag="div"
			size="small"
			color="text-base"
			data-test-id="automation-proposal-caveat"
		>
			{{ i18n.baseText('instanceAi.automation.place.localCaveat') }}
		</N8nText>

		<N8nText
			v-if="showsVisibility"
			tag="div"
			size="small"
			color="text-dark"
			:class="$style.line"
			data-test-id="automation-proposal-visible-to"
		>
			<I18nT :keypath="visibleToKey" scope="global">
				<template #project>
					<N8nBadge variant="outline" :class="$style.chip" :title="projectName">
						{{ projectName }}
					</N8nBadge>
				</template>
				<template v-if="place.linked" #place>{{ placeName }}</template>
				<template v-if="showsOthers" #others>{{ othersText }}</template>
			</I18nT>
		</N8nText>
	</div>
</template>

<style lang="scss" module>
// The same gap as the body of the card, so the lines keep their spacing.
.place {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.line {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
}

// A badge keeps its text on one line. It must shrink in the flex row to show its ellipsis.
.chip {
	min-width: 0;
	max-width: 100%;
}
</style>
