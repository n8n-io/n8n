<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { N8nBadge, N8nButton, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

defineEmits<{ 'create-test': [] }>();

const locale = useI18n();

/**
 * TODO: fully implement the logic here
 */
const canCreateEvaluations = computed(() => true);
const isRegisteredCommunity = computed(() => false);
const isNotRegisteredCommunity = computed(() => false);
const hasReachedLimit = computed(() => false);
</script>

<template>
	<div :class="$style.container">
		<div :class="{ [$style.card]: true, [$style.cardActive]: true }">
			<N8nBadge theme="warning" size="small">New</N8nBadge>
			<div :class="$style.cardContent">
				<N8nText tag="h2" size="xlarge" color="text-base" class="mb-2xs">
					{{ locale.baseText('testDefinition.list.evaluations') }}
				</N8nText>
				<N8nText tag="div" color="text-base" class="mb-s ml-s mr-s">
					{{ locale.baseText('testDefinition.list.actionDescription') }}
				</N8nText>
				<template v-if="canCreateEvaluations">
					<N8nButton @click="$emit('create-test')">
						{{ locale.baseText('testDefinition.list.actionButton') }}
					</N8nButton>
				</template>
				<template v-else-if="isRegisteredCommunity">
					<N8nButton @click="$emit('create-test')">
						{{ locale.baseText('testDefinition.list.actionButton') }}
					</N8nButton>
					<N8nText tag="div" color="text-light" size="small" class="mt-2xs">
						{{ locale.baseText('testDefinition.list.actionDescription.registered') }}
					</N8nText>
				</template>
				<template v-else-if="isNotRegisteredCommunity">
					<div :class="$style.divider" class="mb-s"></div>
					<N8nText tag="div" color="text-light" size="small" class="mb-s">
						{{ locale.baseText('testDefinition.list.actionDescription.unregistered') }}
					</N8nText>
					<N8nButton>
						{{ locale.baseText('testDefinition.list.actionButton.unregistered') }}
					</N8nButton>
				</template>
				<template v-else-if="hasReachedLimit">
					<div :class="$style.divider" class="mb-s"></div>
					<N8nText tag="div" color="text-light" size="small" class="mb-s">
						{{ locale.baseText('testDefinition.list.actionDescription.atLimit') }}
					</N8nText>
					<N8nButton>
						{{ locale.baseText('generic.upgrade') }}
					</N8nButton>
				</template>
			</div>
		</div>
		<div :class="{ [$style.card]: true, [$style.cardInActive]: true }">
			<N8nBadge>
				{{ locale.baseText('testDefinition.list.unitTests.badge') }}
			</N8nBadge>
			<div :class="$style.cardContent">
				<N8nText tag="h2" size="xlarge" color="text-base" class="mb-2xs">
					{{ locale.baseText('testDefinition.list.unitTests.title') }}
				</N8nText>
				<N8nText tag="div" color="text-base" class="mb-s">
					{{ locale.baseText('testDefinition.list.unitTests.description') }}
				</N8nText>
				<N8nButton type="secondary">
					{{ locale.baseText('testDefinition.list.unitTests.cta') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	justify-content: center;
	height: 100%;
	align-items: center;
	gap: 24px;
}

.card {
	border-radius: var(--border-radius-base);
	width: 280px;
	height: 290px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-between;
	padding: 20px;
	text-align: center;
}

.cardContent {
	margin: auto;
}

.cardActive {
	border: 1px solid var(--color-foreground-base);
	background-color: var(--color-background-xlight);
}

.cardInActive {
	border: 1px dashed var(--color-foreground-base);
}

.divider {
	border-top: 1px solid var(--color-foreground-light);
}
</style>
