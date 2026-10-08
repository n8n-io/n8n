<script setup lang="ts">
/** Where an automation proposal runs, and who can see the workflow. */
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import type { AutomationProposalCard } from '@n8n/api-types';
import { N8nBadge, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import { placeOf, sharedProjectCount } from './automationProposal';

const props = defineProps<{
	proposal: AutomationProposalCard;
}>();

const i18n = useI18n();

const place = computed(() => placeOf(props.proposal));
const sharedCount = computed(() => sharedProjectCount(props.proposal));

const placeKey = computed(() =>
	place.value.reasonKey
		? 'instanceAi.automation.place.runsOnWithReason'
		: 'instanceAi.automation.place.runsOn',
);

const visibleToKey = computed(() =>
	sharedCount.value > 0
		? 'instanceAi.automation.visibleToShared'
		: 'instanceAi.automation.visibleTo',
);

const placeName = computed(() => {
	if (!place.value.linked) return i18n.baseText('instanceAi.automation.place.thisComputer');
	return place.value.linkedLabel ?? i18n.baseText('instanceAi.automation.place.otherInstance');
});

// A personal project is named "First Last <email>". The card shows only the name.
const projectName = computed(() => {
	const { projectName: name, projectType } = props.proposal.visibleTo;
	if (projectType !== 'personal') return name;
	const parts = splitName(name);
	return parts.name ?? parts.email ?? name;
});

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
				<template v-if="sharedCount > 0" #others>{{ othersText }}</template>
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
