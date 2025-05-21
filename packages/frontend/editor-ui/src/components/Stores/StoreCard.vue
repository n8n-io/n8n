<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { StoreResource } from '../layouts/ResourcesListLayout.vue';

type Props = {
	data: StoreResource;
};

const props = defineProps<Props>();

const i18n = useI18n();
const router = useRouter();
const route = useRoute();

const cardUrl = computed(() => {
	return router.resolve({
		name: VIEWS.STORE,
		params: {
			id: props.data.id,
		},
		query: route.query,
	}).href;
});
</script>

<template>
	<div :class="$style.wrapper" data-test-id="store-card">
		<router-link :to="cardUrl">
			<n8n-card :class="$style.card">
				<template #prepend>
					<n8n-icon
						data-test-id="store-card-icon"
						:class="$style['store-icon']"
						icon="database"
						size="xlarge"
					/>
				</template>
				<template #header>
					<div :class="$style['card-header']">
						<n8n-heading tag="h2" bold size="small" data-test-id="store-card-name">
							{{ data.name }}
						</n8n-heading>
					</div>
				</template>
				<template #footer>
					<div :class="$style['card-footer']">
						<n8n-text
							size="small"
							color="text-light"
							:class="[$style['info-cell']]"
							data-test-id="store-card-fields"
						>
							{{ i18n.baseText('stores.item.fields', { interpolate: { count: data.fieldCount } }) }}
						</n8n-text>
						<n8n-text
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--updated']]"
							data-test-id="store-card-last-updated"
						>
							{{ i18n.baseText('stores.item.updated') }}
							<TimeAgo :date="String(data.updatedAt)" />
						</n8n-text>
						<n8n-text
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--created']]"
							data-test-id="store-card-created"
						>
							{{ i18n.baseText('stores.item.created') }}
							<TimeAgo :date="String(data.createdAt)" />
						</n8n-text>
					</div>
				</template>
			</n8n-card>
		</router-link>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	width: 100%;
	margin-bottom: var(--spacing-2xs);
}

.card {
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.store-icon {
	width: var(--spacing-xl);
	height: var(--spacing-xl);
	flex-shrink: 0;
	color: var(--color-text-base);
	align-content: center;
	text-align: center;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing-xs);
	margin-bottom: var(--spacing-5xs);
}

.card-footer {
	display: flex;
}

.info-cell {
	& + & {
		&::before {
			content: '|';
			margin: 0 var(--spacing-4xs);
		}
	}
}

.cardBadge.with-breadcrumbs {
	:global(.n8n-badge) {
		padding-right: 0;
	}
	:global(.n8n-breadcrumbs) {
		padding-left: var(--spacing-5xs);
	}
}

.card-actions {
	display: flex;
	gap: var(--spacing-xs);
}

@include mixins.breakpoint('sm-and-down') {
	.card {
		flex-wrap: wrap;

		:global(.n8n-card-append) {
			width: 100%;
			margin-top: var(--spacing-3xs);
			padding-left: 40px;
		}
		.card-actions {
			width: 100%;
			justify-content: space-between;
		}
	}
	.info-cell--created {
		display: none;
	}
}
</style>
