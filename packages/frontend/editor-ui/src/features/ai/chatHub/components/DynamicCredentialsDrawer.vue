<script setup lang="ts">
import type { DynamicCredentialItem } from '@/features/ai/chatHub/composables/useDynamicCredentialsStatus';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIconButton, N8nText, N8nSpinner } from '@n8n/design-system';

defineProps<{
	credentials: DynamicCredentialItem[];
	connectedCount: number;
	totalCount: number;
}>();

const emit = defineEmits<{
	close: [];
	authorize: [credentialId: string];
	revoke: [credentialId: string];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.panel">
			<div :class="$style.header">
				<N8nText bold size="large">{{
					i18n.baseText('chatHub.dynamicCredentials.drawer.title')
				}}</N8nText>
				<N8nIconButton
					type="tertiary"
					text
					icon="x"
					data-testid="dynamic-credentials-drawer-close"
					@click="emit('close')"
				/>
			</div>

			<div :class="$style.body">
				<div :class="$style.subtitle">
					<N8nText bold>{{ i18n.baseText('chatHub.dynamicCredentials.drawer.subtitle') }}</N8nText>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('chatHub.dynamicCredentials.drawer.description')
					}}</N8nText>
				</div>

				<ul :class="$style.credentialList">
					<li
						v-for="cred in credentials"
						:key="cred.credentialId"
						:class="$style.credentialRow"
						data-testid="dynamic-credential-row"
					>
						<div :class="$style.credentialInfo">
							<N8nText bold>{{ cred.credentialName }}</N8nText>
							<N8nText
								v-if="cred.credentialStatus === 'configured'"
								size="small"
								color="text-light"
							>
								{{ i18n.baseText('chatHub.dynamicCredentials.drawer.status.connected') }}
							</N8nText>
							<N8nText v-else size="small" color="text-light">
								{{ i18n.baseText('chatHub.dynamicCredentials.drawer.status.notConnected') }}
							</N8nText>
							<N8nText v-if="cred.error" size="small" color="danger">
								{{ cred.error }}
							</N8nText>
						</div>

						<div :class="$style.credentialAction">
							<N8nSpinner v-if="cred.isConnecting" size="small" />
							<N8nButton
								v-else-if="cred.credentialStatus === 'configured'"
								type="tertiary"
								size="small"
								data-testid="dynamic-credential-disconnect"
								@click="emit('revoke', cred.credentialId)"
							>
								{{ i18n.baseText('chatHub.dynamicCredentials.drawer.disconnect') }}
							</N8nButton>
							<N8nButton
								v-else
								type="secondary"
								size="small"
								data-testid="dynamic-credential-connect"
								@click="emit('authorize', cred.credentialId)"
							>
								{{ i18n.baseText('chatHub.dynamicCredentials.drawer.connect') }}
							</N8nButton>
						</div>
					</li>
				</ul>
			</div>

			<div :class="$style.footer">
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('chatHub.dynamicCredentials.drawer.footer', {
							interpolate: {
								connected: String(connectedCount),
								total: String(totalCount),
							},
						})
					}}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
	background-color: var(--color--background--light-2);
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	min-width: 0;
}

.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm) var(--spacing--sm);
	height: 56px;
	flex-shrink: 0;
	border-bottom: var(--border);
}

.body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--sm);
}

.subtitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--sm);
}

.credentialList {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.credentialRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.credentialInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	flex: 1;
}

.credentialAction {
	flex-shrink: 0;
	display: flex;
	align-items: center;
}

.footer {
	flex-shrink: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}
</style>
