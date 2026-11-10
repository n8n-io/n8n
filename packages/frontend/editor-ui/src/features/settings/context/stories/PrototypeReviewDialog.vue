<script setup lang="ts">
// Story-only shell for the preview prototypes. It reuses the header and the list of the real
// dialogs, and puts the preview of a direction on the right, from the `preview` slot. The slot
// gets the model of the item as it is. The real dialogs do not change.
import { computed, ref } from 'vue';
import { N8nButton, N8nCheckbox, N8nDialog, N8nDialogFooter, N8nText } from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import SkillReviewHeader from '../components/SkillReviewHeader.vue';
import SkillReviewPicker from '../components/SkillReviewPicker.vue';
import {
	acceptAll,
	type SkillDecision,
	type SkillReviewGroup,
} from '../components/skillReview.types';

import type { PrototypeItem, ReviewTab } from './prototypeItems';

const props = defineProps<{
	title: string;
	source: string;
	/** Text after the source line, such as the latest commit. */
	details?: string;
	kind: 'update' | 'import';
	items: Array<PrototypeItem<unknown>>;
	/** The project that an import goes to. */
	importTarget?: string;
}>();

const open = defineModel<boolean>('open', { required: true });

defineSlots<{ preview: (props: { item: PrototypeItem<unknown> }) => unknown }>();

const i18n = useI18n();

const TABS: ReviewTab[] = ['review', 'ready', 'unavailable'];
const TAB_LABELS = {
	review: 'settings.context.skills.connect.tab.review',
	ready: 'settings.context.skills.connect.tab.ready',
	unavailable: 'settings.context.skills.connect.tab.unavailable',
} satisfies Record<ReviewTab, BaseTextKey>;

const byTab = computed(() => {
	const tabs: Record<ReviewTab, Array<PrototypeItem<unknown>>> = {
		review: [],
		ready: [],
		unavailable: [],
	};
	for (const item of props.items) tabs[item.tab].push(item);
	return tabs;
});

const tabs = computed<Array<TabOptions<ReviewTab>>>(() =>
	TABS.filter((tab) => byTab.value[tab].length > 0).map((tab) => ({
		value: tab,
		label: i18n.baseText(TAB_LABELS[tab], { interpolate: { count: byTab.value[tab].length } }),
	})),
);

const activeTab = ref<ReviewTab>(TABS.find((tab) => byTab.value[tab].length > 0) ?? 'review');
const previewId = ref<string | null>(byTab.value[activeTab.value][0]?.id ?? null);
const decisions = ref<Record<string, SkillDecision>>(
	acceptAll(props.items.filter((item) => item.decidable)),
);
const reviewed = ref(false);

function selectTab(tab: ReviewTab) {
	activeTab.value = tab;
	previewId.value = byTab.value[tab][0]?.id ?? null;
}

const groups = computed<SkillReviewGroup[]>(() => {
	const items = byTab.value[activeTab.value];
	const toRow = (item: PrototypeItem<unknown>) => ({
		id: item.id,
		title: item.title,
		subtitle: item.subtitle,
		decidable: item.decidable,
		statuses: item.statuses,
	});
	if (!items.some((item) => item.group)) return [{ id: '', name: '', items: items.map(toRow) }];
	const map = new Map<string, SkillReviewGroup>();
	for (const item of items) {
		const group = item.group ?? {
			id: '',
			name: i18n.baseText('settings.context.skills.connect.ungrouped'),
		};
		const entry = map.get(group.id) ?? { ...group, items: [] };
		entry.items.push(toRow(item));
		map.set(group.id, entry);
	}
	return [...map.values()];
});

const preview = computed(() => props.items.find((item) => item.id === previewId.value) ?? null);

const accepted = computed(() =>
	props.items.filter((item) => item.decidable && decisions.value[item.id] === 'accept'),
);
const needsReview = computed(() => accepted.value.some((item) => item.tab === 'review'));
const canApply = computed(
	() => accepted.value.length > 0 && (!needsReview.value || reviewed.value),
);

const applyLabel = computed(() => {
	const count = accepted.value.length;
	if (props.kind === 'update') {
		return i18n.baseText('settings.context.skills.updates.updateSelected', {
			interpolate: { count },
			adjustToNumber: count,
		});
	}
	return i18n.baseText('settings.context.skills.connect.importProject', {
		interpolate: { count, project: props.importTarget ?? '' },
		adjustToNumber: count,
	});
});
</script>

<template>
	<N8nDialog v-model:open="open" size="full" :container-class="$style.wideDialog">
		<SkillReviewHeader
			:title="title"
			:source="source"
			:tabs="tabs"
			:active-tab="activeTab"
			@update:active-tab="selectTab"
		>
			<template v-if="details" #details>
				<span aria-hidden="true">·</span>
				<span>{{ details }}</span>
			</template>
		</SkillReviewHeader>
		<SkillReviewPicker
			v-model:preview-id="previewId"
			v-model:decisions="decisions"
			:groups="groups"
			:can-decide="true"
		>
			<slot v-if="preview" name="preview" :item="preview" />
			<N8nText v-else size="small" color="text-light">
				{{ i18n.baseText('settings.context.skills.connect.preview.empty') }}
			</N8nText>
		</SkillReviewPicker>
		<N8nDialogFooter>
			<span :class="$style.spacer" />
			<N8nCheckbox
				v-if="needsReview"
				v-model="reviewed"
				:label="i18n.baseText('settings.context.skills.updates.reviewedWarnings')"
				:class="$style.reviewed"
			/>
			<N8nButton
				v-if="items.some((item) => item.decidable)"
				:label="applyLabel"
				:disabled="!canApply"
			/>
			<N8nButton
				v-else
				:label="i18n.baseText('settings.context.skills.updates.done')"
				@click="open = false"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.wideDialog.wideDialog {
	--dialog--max-width: min(75rem, calc(100dvw - var(--spacing--lg)));
}

.reviewed {
	align-self: center;
	margin-inline-end: var(--spacing--xs);
}

.spacer {
	flex: 1;
}
</style>
