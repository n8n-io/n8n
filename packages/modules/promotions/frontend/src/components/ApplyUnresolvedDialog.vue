<script setup lang="ts">
import type { PromotionMissingDependency } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import PromotionMissingDependencyList from './PromotionMissingDependencyList.vue';

/**
 * Asks the user to accept the dependencies that an Apply leaves unresolved. Mount it only while
 * the question is open.
 */
const props = defineProps<{ dependencies: PromotionMissingDependency[] }>();

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const i18n = useI18n();

const text = (
	key: 'promotions.preview.unresolved.title.apply' | 'promotions.preview.submit.apply.unresolved',
) =>
	i18n.baseText(key, {
		adjustToNumber: props.dependencies.length,
		interpolate: { count: String(props.dependencies.length) },
	});
</script>

<template>
	<N8nDialog
		open
		size="medium"
		:aria-description="i18n.baseText('promotions.preview.unresolved.body.apply')"
		data-test-id="apply-unresolved-dialog"
		@update:open="emit('cancel')"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ text('promotions.preview.unresolved.title.apply') }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.body">
				<N8nText color="text-base">
					{{ i18n.baseText('promotions.preview.unresolved.body.apply') }}
				</N8nText>
				<PromotionMissingDependencyList :dependencies="dependencies" />
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				type="button"
				variant="outline"
				data-test-id="apply-unresolved-cancel"
				@click="emit('cancel')"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton type="button" data-test-id="apply-unresolved-confirm" @click="emit('confirm')">
				{{ text('promotions.preview.submit.apply.unresolved') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
