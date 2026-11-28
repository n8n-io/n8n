<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nAlertDialog, N8nBadge, N8nInputLabel, N8nSelect2, N8nText } from '@n8n/design-system';
import type { SelectGroupItem, SelectValue } from '@n8n/design-system';

const props = defineProps<{
	nodeName: string;
	currentVersion: number;
	latest: number | undefined;
	/** Sorted, highest first. */
	versions: number[];
	disabled: boolean;
}>();

const emit = defineEmits<{
	update: [version: number];
}>();

const i18n = useI18n();

// Stays set after the dialog closes, so the title keeps the version during the close animation.
const pendingVersion = ref<number>();
const isConfirmOpen = ref(false);

const label = computed(() =>
	i18n.baseText('nodeSettings.versionPicker.label', { interpolate: { node: props.nodeName } }),
);

const hasDisabledVersion = computed(() =>
	props.versions.some((version) => version < props.currentVersion),
);

const items = computed(() => {
	const toItem = (version: number) => ({
		value: version,
		label: String(version),
		disabled: version < props.currentVersion,
	});
	// A node above the latest version cannot go back to it, so the latest version is not recommended.
	const recommended =
		props.latest !== undefined && props.latest >= props.currentVersion ? props.latest : undefined;
	const groups: Array<SelectGroupItem<number>> = [
		{
			type: 'group',
			label: i18n.baseText('generic.recommended'),
			items: props.versions.filter((version) => version === recommended).map(toItem),
		},
		{
			type: 'group',
			label: i18n.baseText('nodeSettings.versionPicker.previousVersions'),
			items: props.versions.filter((version) => version !== recommended).map(toItem),
		},
	];

	return groups.filter((group) => group.items.length > 0);
});

function onSelect(version: SelectValue | undefined) {
	if (typeof version !== 'number' || version === props.currentVersion) return;
	pendingVersion.value = version;
	isConfirmOpen.value = true;
}

function onConfirm() {
	if (!isConfirmOpen.value || pendingVersion.value === undefined) return;
	isConfirmOpen.value = false;
	emit('update', pendingVersion.value);
}

function onOpenChange(open: boolean) {
	if (!open) isConfirmOpen.value = false;
}
</script>

<template>
	<div :class="$style.picker">
		<N8nInputLabel :label="label" :bold="false" size="small" color="text-dark">
			<N8nSelect2
				:model-value="currentVersion"
				:items="items"
				:disabled="disabled"
				size="small"
				:aria-label="label"
				data-test-id="node-version-select"
				@update:model-value="onSelect"
			>
				<template #item-label="{ item }">
					<span :class="$style.item">
						{{ item.label }}
						<N8nBadge v-if="item.value === latest">{{
							i18n.baseText('nodeSettings.latest')
						}}</N8nBadge>
						<N8nText
							v-if="item.value === currentVersion"
							tag="span"
							size="small"
							color="text-light"
						>
							{{ i18n.baseText('nodeSettings.versionPicker.current') }}
						</N8nText>
					</span>
				</template>
				<template v-if="hasDisabledVersion" #footer>
					<N8nText tag="div" size="small" color="text-light" :class="$style.footer">
						{{ i18n.baseText('nodeSettings.versionPicker.olderDisabled') }}
					</N8nText>
				</template>
			</N8nSelect2>
		</N8nInputLabel>
		<N8nAlertDialog
			:open="isConfirmOpen"
			:title="
				i18n.baseText('nodeSettings.versionPicker.confirm.title', {
					interpolate: { node: nodeName, version: String(pendingVersion) },
				})
			"
			:description="i18n.baseText('nodeSettings.versionPicker.confirm.carryOver')"
			:action-label="i18n.baseText('generic.update')"
			:cancel-label="i18n.baseText('generic.cancel')"
			@action="onConfirm"
			@update:open="onOpenChange"
		>
			<N8nText tag="p" size="small">
				{{ i18n.baseText('nodeSettings.versionPicker.confirm.undo') }}
			</N8nText>
		</N8nAlertDialog>
	</div>
</template>

<style lang="scss" module>
.picker {
	border-top: var(--border);
	padding: var(--spacing--xs) 0 var(--spacing--2xs) 0;
}

.item {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.footer {
	// The sentence wraps to the width that the rows set. It does not widen the menu.
	width: 0;
	min-width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	white-space: normal;
}
</style>
