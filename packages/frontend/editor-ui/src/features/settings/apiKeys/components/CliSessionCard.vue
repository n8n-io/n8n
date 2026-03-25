<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import type { CliSessionResponseDto } from '@n8n/api-types';

import { N8nActionToggle, N8nCard, N8nText } from '@n8n/design-system';
import TimeAgo from '@/app/components/TimeAgo.vue';

const i18n = useI18n();

const SESSION_ACTIONS = {
	VIEW: 'view',
	REVOKE: 'revoke',
};

const ACTION_LIST = [
	{
		label: i18n.baseText('settings.api.cliAccess.action.view'),
		value: SESSION_ACTIONS.VIEW,
	},
	{
		label: i18n.baseText('settings.api.cliAccess.action.revoke'),
		value: SESSION_ACTIONS.REVOKE,
	},
];

const props = defineProps<{
	session: CliSessionResponseDto;
}>();

const emit = defineEmits<{
	view: [session: CliSessionResponseDto];
	revoke: [session: CliSessionResponseDto];
}>();

function onAction(action: string) {
	if (action === SESSION_ACTIONS.VIEW) {
		emit('view', props.session);
	} else if (action === SESSION_ACTIONS.REVOKE) {
		emit('revoke', props.session);
	}
}

function getCardTitle(session: CliSessionResponseDto): string {
	if (session.deviceName) return session.deviceName;
	if (session.os) return session.os;
	return i18n.baseText('settings.api.cliAccess.unknownDevice');
}

function getCardSubtitle(session: CliSessionResponseDto): string {
	if (session.os && session.deviceName) return session.os;
	return '';
}
</script>

<template>
	<N8nCard
		:class="$style.cardLink"
		data-test-id="cli-access-card"
		@click="emit('view', props.session)"
	>
		<template #header>
			<div>
				<N8nText tag="h2" bold :class="$style.cardHeading">
					{{ getCardTitle(session) }}
				</N8nText>
				<div :class="$style.cardDescription">
					<N8nText v-if="getCardSubtitle(session)" color="text-light" size="small">
						{{ getCardSubtitle(session) }} · {{ ' ' }}
					</N8nText>
					<N8nText color="text-light" size="small">
						<TimeAgo :date="session.createdAt" />
					</N8nText>
				</div>
			</div>
			<div :class="$style.cardFingerprint">
				<N8nText color="text-light" size="small">
					{{ session.id }}
				</N8nText>
			</div>
		</template>

		<template #append>
			<div :class="$style.cardActions">
				<N8nActionToggle :actions="ACTION_LIST" theme="dark" @action="onAction" />
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0 0 0 var(--spacing--sm);
	align-items: stretch;

	&:hover {
		box-shadow: var(--shadow--card-hover);
	}
}

.cardHeading {
	font-size: var(--font-size--sm);
	word-break: break-word;
	padding: var(--spacing--sm) 0 0 var(--spacing--sm);
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);
}

.cardFingerprint {
	flex-grow: 1;
	display: flex;
	justify-content: center;
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	padding: 0 var(--spacing--sm) 0 0;
	cursor: default;
}
</style>
