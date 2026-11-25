<script setup lang="ts">
import type { AppBindingWarning, AppDescribedBinding } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { BINDING_KINDS, resourceIdOf, setupSentence, warningLabel } from './bindingKinds';

const props = defineProps<{
	binding: AppDescribedBinding;
	projectId: string;
	warning?: AppBindingWarning;
	canUpdate: boolean;
}>();

const emit = defineEmits<{ close: []; remove: [] }>();

const i18n = useI18n();
const router = useRouter();

// Marks where the bold part goes, so the translated sentence keeps its own word order.
const ACTIONS_MARKER = '\u0000';

const config = computed(() => BINDING_KINDS[props.binding.kind]);
const warningText = computed(() =>
	props.warning ? i18n.baseText(warningLabel(props.warning.code, props.binding.kind)) : undefined,
);
const href = computed(() =>
	'missing' in props.binding
		? undefined
		: router.resolve(config.value.route(props.projectId, resourceIdOf(props.binding))).fullPath,
);
const sentence = computed(() => {
	const { template, actions, verbs } = setupSentence(props.binding);
	const list = verbs?.map((verb) => i18n.baseText(verb));
	const [before = '', after = ''] = i18n
		.baseText(template, { interpolate: { actions: ACTIONS_MARKER } })
		.split(ACTIONS_MARKER);
	return {
		before,
		actions: i18n.baseText(
			actions,
			list
				? {
						interpolate: {
							verbs: new Intl.ListFormat(i18n.locale, { type: 'conjunction' }).format(list),
						},
					}
				: undefined,
		),
		after,
	};
});
</script>

<template>
	<N8nDialog
		:open="true"
		size="medium"
		:data-test-id="`app-binding-${binding.key}-details`"
		@update:open="!$event && emit('close')"
	>
		<N8nDialogHeader>
			<N8nDialogTitle as-child>
				<div :class="$style.title">
					<N8nIcon :icon="config.icon" :size="20" :class="$style.icon" />
					<span :class="$style.name">{{ binding.name }}</span>
				</div>
			</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody :class="$style.body">
			<N8nCallout
				v-if="warningText"
				theme="warning"
				:data-test-id="`app-binding-${binding.key}-callout`"
			>
				{{ warningText }}
			</N8nCallout>
			<N8nText tag="p" size="medium" :data-test-id="`app-binding-${binding.key}-setup`">
				{{ sentence.before }}<strong :class="$style.actions">{{ sentence.actions }}</strong
				>{{ sentence.after }}
			</N8nText>
			<N8nLink
				v-if="href"
				:to="href"
				:new-window="true"
				:class="$style.open"
				:data-test-id="`app-binding-${binding.key}-open`"
			>
				{{ i18n.baseText(config.openLabel) }}
				<N8nIcon icon="arrow-up-right" :size="14" />
			</N8nLink>
		</N8nDialogBody>
		<N8nDialogFooter :class="$style.footer">
			<N8nButton
				v-if="canUpdate"
				variant="ghost"
				icon="trash-2"
				:data-test-id="`app-binding-${binding.key}-remove`"
				@click="emit('remove')"
			>
				{{ i18n.baseText('apps.configure.connections.remove') }}
			</N8nButton>
			<N8nButton variant="outline" :class="$style.close" @click="emit('close')">
				{{ i18n.baseText('generic.close') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.icon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

/* Set the weight here: the design system resets <strong>. */
.actions {
	font-weight: var(--font-weight--bold);
}

.open {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

/* Remove sits on the left and Close on the right. */
.footer {
	justify-content: space-between;
}

.close {
	margin-left: auto;
}
</style>
