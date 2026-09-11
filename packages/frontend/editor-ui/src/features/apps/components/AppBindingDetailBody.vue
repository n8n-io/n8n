<script setup lang="ts" generic="P extends string">
import { N8nButton, N8nCheckbox, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, shallowRef } from 'vue';

import type { ToolConnectionItem } from '@/features/shared/toolsConnection/types';

const props = withDefaults(
	defineProps<{
		item: ToolConnectionItem;
		connected: boolean;
		/** Stored permissions while connected. */
		permissions?: P[];
		/** One checkbox per option; kinds without permissions pass none. */
		permissionOptions?: Array<{ value: P; label: string }>;
		note: string;
	}>(),
	{ permissions: () => [], permissionOptions: () => [] },
);

const emit = defineEmits<{
	connect: [permissions: P[]];
	save: [permissions: P[]];
	disconnect: [];
}>();

const i18n = useI18n();

// The list unmounts this body between items, so the selection needs no reset.
// `shallowRef` keeps `P` intact; `ref` would unwrap it to `string`.
const selected = shallowRef<P[]>(
	props.connected ? [...props.permissions] : props.permissionOptions.map((option) => option.value),
);

function setPermission(value: P, on: boolean) {
	const next = new Set(selected.value);
	if (on) next.add(value);
	else next.delete(value);
	// Keep the option order so the payload is stable regardless of click order.
	selected.value = props.permissionOptions
		.map((option) => option.value)
		.filter((option) => next.has(option));
}

const hasPermissionOptions = computed(() => props.permissionOptions.length > 0);
const nothingSelected = computed(() => hasPermissionOptions.value && selected.value.length === 0);
const hasChanges = computed(
	() =>
		selected.value.length !== props.permissions.length ||
		selected.value.some((value) => !props.permissions.includes(value)),
);
</script>

<template>
	<div :class="$style.container" data-test-id="app-binding-detail">
		<N8nText v-if="item.description" tag="p" size="small" data-test-id="app-binding-description">
			{{ item.description }}
		</N8nText>

		<div v-if="hasPermissionOptions" :class="$style.options">
			<N8nCheckbox
				v-for="option in permissionOptions"
				:key="option.value"
				:model-value="selected.includes(option.value)"
				:label="option.label"
				:data-test-id="`app-binding-permission-${option.value}`"
				@update:model-value="setPermission(option.value, $event)"
			/>
		</div>

		<N8nText tag="p" size="small" color="text-light" data-test-id="app-binding-note">
			{{ note }}
		</N8nText>

		<footer :class="$style.footer">
			<template v-if="connected">
				<N8nButton
					variant="destructive"
					size="small"
					:label="i18n.baseText('generic.disconnect')"
					data-test-id="app-binding-disconnect"
					@click="emit('disconnect')"
				/>
				<N8nButton
					v-if="hasPermissionOptions"
					size="small"
					:label="i18n.baseText('generic.save')"
					:disabled="!hasChanges || nothingSelected"
					data-test-id="app-binding-save"
					@click="emit('save', selected)"
				/>
			</template>
			<N8nButton
				v-else
				size="small"
				:label="i18n.baseText('apps.connections.connect')"
				:disabled="nothingSelected"
				data-test-id="app-binding-connect"
				@click="emit('connect', selected)"
			/>
		</footer>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);

	p {
		margin: 0;
	}
}

.options {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--md);
	border-top: 1px solid var(--border-color);
}
</style>
