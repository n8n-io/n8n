<script lang="ts" setup>
import { computed } from 'vue';

import type { ActionDropdownItem } from '../../types';
import N8nActionDropdown from '../N8nActionDropdown';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

type PublishAction = 'publish' | 'quick-publish' | 'save-draft' | 'unpublish';

const props = withDefaults(
	defineProps<{
		status: 'published' | 'unpublished' | 'draft' | 'unpublishedDraft';
		variant?: 'dot' | 'badge' | 'actions';
	}>(),
	{
		variant: 'badge',
	},
);

defineEmits<{
	click: [event: MouseEvent];
	action: [action: PublishAction];
}>();

const indicatorText = computed(() => {
	if (props.status === 'published' || props.status === 'unpublished') {
		return 'Published';
	}

	return 'Draft';
});

const unpublishedChanges = computed(() => {
	return props.status === 'unpublished' || props.status === 'unpublishedDraft';
});

const dropdownItems = computed<Array<ActionDropdownItem<PublishAction>>>(() => [
	{
		id: 'publish',
		label: 'Publish',
		shortcut: {
			keys: ['shift', 'p'],
		},
	},
	{
		id: 'quick-publish',
		label: 'Quick publish',
		shortcut: {
			keys: ['shift', 'alt', 'p'],
		},
	},
	{
		id: 'save-draft',
		label: 'Save draft',
		shortcut: {
			keys: ['meta', 's'],
		},
	},
	{
		id: 'unpublish',
		label: 'Unpublish',
		shortcut: {
			keys: ['shift', 'u'],
		},
	},
]);

const onDropdownAction = (action: PublishAction) => {
	$emit('action', action);
};
</script>

<template>
	<div v-if="props.variant === 'badge'">
		<N8nText v-if="unpublishedChanges" color="text-light" :class="$style.indicatorChangesText"
			>Unpublished changes</N8nText
		>
		<div
			:class="[
				$style.indicatorBadge,
				{
					[$style.published]: props.status === 'published',
					[$style.unpublished]: unpublishedChanges,
				},
			]"
			@click="$emit('click', $event)"
		>
			<span
				:class="[
					$style.indicatorDot,
					{
						[$style.published]: props.status === 'published',
						[$style.unpublished]: unpublishedChanges,
					},
				]"
			/>
			<N8nText bold compact>{{ indicatorText }}</N8nText>
		</div>
	</div>
	<div v-else-if="props.variant === 'actions'" :class="$style.flex">
		<N8nText v-if="unpublishedChanges" color="text-light" :class="$style.indicatorChangesText"
			>Unpublished changes</N8nText
		>
		<div :class="$style.splitButton">
			<div
				:class="[
					$style.indicatorBadge,
					$style.mainButton,
					{
						[$style.published]: props.status === 'published',
						[$style.unpublished]: unpublishedChanges,
					},
				]"
				@click="$emit('click', $event)"
			>
				<span
					:class="[
						$style.indicatorDot,
						{
							[$style.published]: props.status === 'published',
							[$style.unpublished]: unpublishedChanges,
						},
					]"
				/>
				<N8nText bold compact>{{ indicatorText }}</N8nText>
			</div>
			<N8nActionDropdown
				:items="dropdownItems"
				activator-icon="chevron-down"
				activator-size="small"
				:class="$style.dropdownButton"
				@select="onDropdownAction"
			>
				<template #activator>
					<div
						:class="[
							$style.indicatorBadge,
							$style.dropdownActivator,
							{
								[$style.published]: props.status === 'published',
								[$style.unpublished]: unpublishedChanges,
							},
						]"
					>
						<N8nIcon icon="chevron-down" size="large" :stroke-width="1.25" />
					</div>
				</template>
			</N8nActionDropdown>
		</div>
	</div>
	<span
		v-else
		:class="[
			$style.indicatorDot,
			{
				[$style.published]: props.status === 'published',
				[$style.unpublished]: unpublishedChanges,
			},
		]"
	/>
</template>

<style lang="scss" module>
.indicatorDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	background-color: var(--color--foreground--shade-2);
	display: inline-block;

	&.published {
		background-color: var(--color--mint-600);
	}

	&.unpublished {
		background-color: var(--color--yellow-500);
	}
}

.indicatorBadge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: 6px;
	font-size: var(--font-size--sm);
	font-weight: 500;
	color: var(--color--text--base);
	gap: 8px;
	cursor: pointer;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}

	/* &.published {
		background-color: var(--color--mint-900);
		border-color: var(--color--mint-700);
	}

	&.unpublished {
		background-color: var(--color--yellow-900);
		border-color: var(--color--yellow-700);
	} */
}

.indicatorChangesText {
	padding-right: var(--spacing--2xs);
}

.splitButton {
	display: flex;
	align-items: center;
}

.mainButton {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	border-right: none;
	height: 36px;
	padding: var(--spacing--3xs) 14px;
}

.dropdownActivator {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	padding: var(--spacing--3xs) var(--spacing--3xs);
	min-width: 36px;
	height: 36px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
}

.dropdownButton {
	display: contents;
}

.flex {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
