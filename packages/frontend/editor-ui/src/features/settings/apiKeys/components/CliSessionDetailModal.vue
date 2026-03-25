<script lang="ts" setup>
import Modal from '@/app/components/Modal.vue';
import { CLI_SESSION_DETAIL_MODAL_KEY } from '../apiKeys.constants';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import type { CliSessionResponseDto } from '@n8n/api-types';
import { DateTime } from 'luxon';

import { N8nButton, N8nInputLabel, N8nText } from '@n8n/design-system';

const i18n = useI18n();
const uiStore = useUIStore();
const modalBus = createEventBus();

const props = defineProps<{
	session: CliSessionResponseDto;
}>();

const emit = defineEmits<{
	revoke: [session: CliSessionResponseDto];
}>();

function closeModal() {
	uiStore.closeModal(CLI_SESSION_DETAIL_MODAL_KEY);
}

function onRevoke() {
	emit('revoke', props.session);
	closeModal();
}

function formatDate(isoDate: string): string {
	return DateTime.fromISO(isoDate).toFormat('ccc, MMM d yyyy, HH:mm');
}
</script>

<template>
	<Modal
		:title="i18n.baseText('settings.api.cliAccess.modal.title')"
		:event-bus="modalBus"
		:name="CLI_SESSION_DETAIL_MODAL_KEY"
		width="600px"
		:lock-scroll="false"
		:close-on-esc="true"
		:close-on-click-modal="false"
		:show-close="true"
	>
		<template #content>
			<div :class="$style.form">
				<N8nInputLabel
					:label="i18n.baseText('settings.api.cliAccess.modal.createdAt')"
					color="text-dark"
				>
					<N8nText>{{ formatDate(session.createdAt) }}</N8nText>
				</N8nInputLabel>

				<N8nInputLabel
					:label="i18n.baseText('settings.api.cliAccess.modal.accessTokenExpiresAt')"
					color="text-dark"
				>
					<N8nText>{{ formatDate(session.accessTokenExpiresAt) }}</N8nText>
				</N8nInputLabel>

				<N8nInputLabel
					:label="i18n.baseText('settings.api.cliAccess.modal.refreshTokenExpiresAt')"
					color="text-dark"
				>
					<N8nText>{{ formatDate(session.refreshTokenExpiresAt) }}</N8nText>
				</N8nInputLabel>

				<N8nInputLabel
					v-if="session.ip"
					:label="i18n.baseText('settings.api.cliAccess.modal.ip')"
					color="text-dark"
				>
					<N8nText>{{ session.ip }}</N8nText>
				</N8nInputLabel>

				<N8nInputLabel
					:label="i18n.baseText('settings.api.cliAccess.modal.scopes')"
					color="text-dark"
				>
					<div v-if="session.scopes.length" :class="$style.scopesList">
						<N8nText
							v-for="scope in session.scopes"
							:key="scope"
							size="small"
							:class="$style.scopeTag"
						>
							{{ scope }}
						</N8nText>
					</div>
					<N8nText v-else color="text-light">
						{{ i18n.baseText('settings.api.cliAccess.noScopes') }}
					</N8nText>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="destructive"
					:label="i18n.baseText('settings.api.cliAccess.action.revoke')"
					@click="onRevoke"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.scopesList {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.scopeTag {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--color--foreground);
	border-radius: var(--radius);
}

.footer {
	display: flex;
	flex-direction: row-reverse;
}
</style>
