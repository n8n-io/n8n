<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{ failures: Array<{ id: string; name: string; reason: string }> }>();

const i18n = useI18n();
</script>

<template>
	<section :class="$style.section">
		<p>{{ i18n.baseText('projects.move.republishFailed.folder.message') }}</p>
		<ul :class="$style.items">
			<li
				v-for="failure in failures"
				:key="failure.id"
				:class="$style.item"
				data-test-id="republish-failure"
			>
				<N8nText size="small" color="text-dark">
					{{
						i18n.baseText('projects.move.republishFailed.folder.item', {
							interpolate: { name: failure.name, reason: failure.reason },
						})
					}}
				</N8nText>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--xs);
}

.items {
	margin: 0;
	padding-left: var(--spacing--sm);
	list-style: disc;
}

.item + .item {
	margin-top: var(--spacing--5xs);
}
</style>
