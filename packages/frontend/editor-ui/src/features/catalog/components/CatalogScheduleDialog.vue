<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';

import type {
	CatalogEntry,
	CatalogSubscription,
	CatalogSubscriptionInput,
	ScheduleDraft,
} from '@/features/catalog/catalog.types';
import {
	cronToDraft,
	DEFAULT_SCHEDULE_DRAFT,
	draftToCron,
	resolveBrowserTimezone,
	SCHEDULE_FREQUENCIES,
} from '@/features/catalog/catalog.utils';

const props = defineProps<{
	entry: CatalogEntry;
	/** Set when an existing schedule is being changed rather than a new one added. */
	subscription?: CatalogSubscription;
	saving: boolean;
}>();

const emit = defineEmits<{
	close: [];
	submit: [input: CatalogSubscriptionInput];
}>();

const i18n = useI18n();

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = [0, 15, 30, 45];
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

const draft = ref<ScheduleDraft>({ ...DEFAULT_SCHEDULE_DRAFT });
const inputs = ref<Record<string, string>>({});
const timezone = ref(resolveBrowserTimezone());

watch(
	() => [props.entry, props.subscription] as const,
	([entry, subscription]) => {
		draft.value = subscription
			? cronToDraft(subscription.cronExpression)
			: { ...DEFAULT_SCHEDULE_DRAFT };
		timezone.value = subscription?.timezone ?? resolveBrowserTimezone();
		// Seed from the stored values so editing a schedule doesn't blank them, but
		// only for fields the workflow still declares.
		inputs.value = Object.fromEntries(
			entry.fields.map((field) => [field.name, String(subscription?.inputs?.[field.name] ?? '')]),
		);
	},
	{ immediate: true },
);

const pad = (value: number) => String(value).padStart(2, '0');

const weekdayLabel = (weekday: number) =>
	i18n.baseText(
		`catalog.schedule.weekday.${weekday}` as `catalog.schedule.weekday.${0 | 1 | 2 | 3 | 4 | 5 | 6}`,
	);

const frequencyLabel = (frequency: (typeof SCHEDULE_FREQUENCIES)[number]) =>
	i18n.baseText(`catalog.schedule.frequency.${frequency}`);

const close = () => {
	if (props.saving) return;
	emit('close');
};

const submit = () => {
	emit('submit', {
		cronExpression: draftToCron(draft.value),
		timezone: timezone.value,
		inputs: { ...inputs.value },
		// Pausing lives in the list, not here. Carried through unchanged so editing
		// a paused schedule doesn't quietly start it running again.
		enabled: props.subscription?.enabled ?? true,
	});
};
</script>

<template>
	<N8nDialog
		:open="true"
		size="medium"
		:header="
			subscription
				? i18n.baseText('catalog.schedule.edit.title')
				: i18n.baseText('catalog.schedule.create.title')
		"
		:description="entry.name"
		@update:open="close"
	>
		<form :class="$style.form" data-test-id="catalog-schedule-dialog" @submit.prevent="submit">
			<div :class="$style.row">
				<N8nInputLabel
					input-name="catalog-schedule-frequency"
					:label="i18n.baseText('catalog.schedule.frequency')"
				>
					<N8nSelect
						id="catalog-schedule-frequency"
						v-model="draft.frequency"
						:teleported="false"
						data-test-id="catalog-schedule-frequency"
					>
						<N8nOption
							v-for="frequency in SCHEDULE_FREQUENCIES"
							:key="frequency"
							:value="frequency"
							:label="frequencyLabel(frequency)"
						/>
					</N8nSelect>
				</N8nInputLabel>

				<N8nInputLabel
					v-if="draft.frequency === 'weekly'"
					input-name="catalog-schedule-weekday"
					:label="i18n.baseText('catalog.schedule.weekday')"
				>
					<N8nSelect id="catalog-schedule-weekday" v-model="draft.weekday" :teleported="false">
						<N8nOption
							v-for="weekday in WEEKDAYS"
							:key="weekday"
							:value="weekday"
							:label="weekdayLabel(weekday)"
						/>
					</N8nSelect>
				</N8nInputLabel>

				<N8nInputLabel
					v-if="draft.frequency !== 'hourly'"
					input-name="catalog-schedule-hour"
					:label="i18n.baseText('catalog.schedule.hour')"
				>
					<N8nSelect id="catalog-schedule-hour" v-model="draft.hour" :teleported="false">
						<N8nOption v-for="hour in HOURS" :key="hour" :value="hour" :label="pad(hour)" />
					</N8nSelect>
				</N8nInputLabel>

				<N8nInputLabel
					input-name="catalog-schedule-minute"
					:label="i18n.baseText('catalog.schedule.minute')"
				>
					<N8nSelect id="catalog-schedule-minute" v-model="draft.minute" :teleported="false">
						<N8nOption
							v-for="minute in MINUTES"
							:key="minute"
							:value="minute"
							:label="pad(minute)"
						/>
					</N8nSelect>
				</N8nInputLabel>
			</div>

			<N8nText size="small" color="text-light">
				{{ i18n.baseText('catalog.schedule.timezone', { interpolate: { timezone } }) }}
			</N8nText>

			<N8nInputLabel
				v-for="field in entry.fields"
				:key="field.name"
				:input-name="`catalog-schedule-input-${field.name}`"
				:label="field.name"
			>
				<N8nInput
					:id="`catalog-schedule-input-${field.name}`"
					v-model="inputs[field.name]"
					:name="field.name"
					:placeholder="field.type"
				/>
			</N8nInputLabel>

			<N8nDialogFooter>
				<N8nButton type="button" variant="outline" :disabled="saving" @click="close">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="submit" :loading="saving" data-test-id="catalog-schedule-submit">
					{{ i18n.baseText('catalog.schedule.save') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}

.row {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: var(--spacing--2xs);
	align-items: end;
}
</style>
