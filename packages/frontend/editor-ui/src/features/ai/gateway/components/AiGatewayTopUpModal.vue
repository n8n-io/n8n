<script lang="ts" setup>
import { N8nIcon, N8nText } from '@n8n/design-system';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import Modal from '@/app/components/Modal.vue';
</script>

<template>
	<Modal
		:name="AI_GATEWAY_TOP_UP_MODAL_KEY"
		width="520px"
		custom-class="ai-gateway-topup-dialog"
		data-test-id="ai-gateway-topup-modal"
	>
		<template #content>
			<div :class="$style.contentWrapper">
				<div :class="$style.body">
					<N8nIcon icon="hourglass" size="xlarge" color="text-base" :class="$style.icon" />
					<N8nText :class="$style.title" bold color="text-dark">Top up is coming soon</N8nText>

					<div :class="$style.paragraphs">
						<p :class="$style.paragraph">
							You'll be notified in the coming weeks when this feature becomes available.
						</p>
					</div>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.contentWrapper {
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-height: 300px;
}

.body {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0 var(--spacing--xl);
}

.icon {
	flex-shrink: 0;
}

.title {
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
	margin: 0;
}

.paragraphs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.paragraph {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	text-align: center;
}
</style>

<style lang="scss">
.ai-gateway-topup-dialog.el-dialog {
	background-color: var(--color--background);
}
</style>
