<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import PrivateCredentialIcon from '@/features/resolvers/components/PrivateCredentialIcon.vue';

interface Props {
	credentialName: string;
	isConnected: boolean;
	canModify: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
	connect: [];
	modify: [];
	disconnect: [];
}>();

const i18n = useI18n();

const connectLabel = computed(() => i18n.baseText('credentials.private.row.connect'));
</script>

<template>
	<div :class="$style.row">
		<div :class="$style.left">
			<N8nText size="small">{{ credentialName }}</N8nText>
			<PrivateCredentialIcon :tooltip="false" />
		</div>
		<div :class="$style.right">
			<template v-if="isConnected">
				<N8nIcon icon="circle-check" color="success" size="small" />
				<N8nText size="small" color="success">
					{{ i18n.baseText('credentials.private.row.connected') }}
				</N8nText>
				<template v-if="canModify">
					<button :class="$style.textLink" @click="emit('modify')">
						{{ i18n.baseText('credentials.private.row.modify') }}
					</button>
					<button :class="$style.textLink" @click="emit('disconnect')">
						{{ i18n.baseText('credentials.private.row.disconnect') }}
					</button>
				</template>
			</template>
			<template v-else>
				<N8nButton
					v-if="canModify"
					size="small"
					type="secondary"
					:label="connectLabel"
					data-test-id="node-credential-private-connect"
					@click="emit('connect')"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xs) 0;
}

.left {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;

	> :first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.right {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.textLink {
	all: unset;
	cursor: pointer;
	color: var(--color-primary);
	font-size: var(--font-size-2xs);

	&:hover {
		text-decoration: underline;
	}
}
</style>
