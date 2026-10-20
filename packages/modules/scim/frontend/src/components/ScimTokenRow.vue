<script setup lang="ts">
import type { ScimTokenDetails } from '@n8n/api-types';
import {
	N8nButton,
	N8nCopyInput,
	N8nDropdownMenu,
	N8nIcon,
	N8nSettingsRow,
	N8nText,
} from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { formatDate, formatPersonName, formatTimeAgo } from '../scim.utils';

/**
 * The bearer token row. The backend returns the token value once, right after
 * it is generated or rotated. Until the page unmounts, the row shows that
 * value with a copy action. After that, only the last four characters show.
 */
const props = withDefaults(
	defineProps<{
		hasToken: boolean;
		tokenHint: string | null;
		token: ScimTokenDetails | null;
		/** The value from the last generate or rotate in this view, or null. */
		revealedToken: string | null;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	generate: [];
	rotate: [];
	revoke: [];
	copy: [];
}>();

const i18n = useI18n();

const MASK = '••••••••';

const description = computed(() => {
	if (!props.hasToken || !props.token) {
		return i18n.baseText('settings.scim.token.noToken.description');
	}
	const date = formatDate(props.token.createdAt);
	const created = props.token.createdBy
		? i18n.baseText('settings.scim.token.createdBy', {
				interpolate: { date, name: formatPersonName(props.token.createdBy) },
			})
		: i18n.baseText('settings.scim.token.created', { interpolate: { date } });
	const used = props.token.lastUsedAt
		? i18n.baseText('settings.scim.token.lastUsed', {
				interpolate: { time: formatTimeAgo(props.token.lastUsedAt) },
			})
		: i18n.baseText('settings.scim.token.notUsed');
	return `${created} · ${used}`;
});

const displayValue = computed(() => props.revealedToken ?? `${MASK}${props.tokenHint ?? ''}`);

const menuItems = computed<Array<DropdownMenuItemProps<'rotate' | 'revoke'>>>(() => [
	{
		id: 'rotate',
		label: i18n.baseText('settings.scim.token.rotate'),
		icon: { type: 'icon', value: 'refresh-cw' },
	},
	{
		id: 'revoke',
		label: i18n.baseText('settings.scim.token.revoke'),
		icon: { type: 'icon', value: 'trash-2' },
		divided: true,
		destructive: true,
	},
]);

function onMenuSelect(id: 'rotate' | 'revoke') {
	if (id === 'rotate') emit('rotate');
	if (id === 'revoke') emit('revoke');
}
</script>

<template>
	<N8nSettingsRow
		:title="i18n.baseText('settings.scim.token.title')"
		:description="description"
		data-test-id="scim-token-row"
	>
		<template #action>
			<N8nButton
				v-if="!props.hasToken"
				variant="outline"
				size="medium"
				icon="key-round"
				:label="i18n.baseText('settings.scim.token.generate')"
				:disabled="props.disabled"
				data-test-id="scim-token-generate"
				@click="emit('generate')"
			/>
			<div v-else :class="$style.tokenField">
				<div :class="$style.fieldRow">
					<N8nCopyInput
						:value="props.revealedToken ?? ''"
						:display-value="displayValue"
						:label="i18n.baseText('settings.scim.token.title')"
						:copy-label="i18n.baseText('settings.scim.token.copy')"
						:allow-copy="props.revealedToken !== null"
						size="medium"
						redact
						data-test-id="scim-token-input"
						@copy="emit('copy')"
					/>
					<N8nDropdownMenu
						:items="menuItems"
						placement="bottom-end"
						data-test-id="scim-token-menu"
						@select="onMenuSelect"
					>
						<template #trigger>
							<N8nButton
								variant="ghost"
								size="medium"
								icon-only
								:disabled="props.disabled"
								:aria-label="i18n.baseText('settings.scim.token.actions')"
								data-test-id="scim-token-actions"
							>
								<template #icon><N8nIcon icon="ellipsis" /></template>
							</N8nButton>
						</template>
					</N8nDropdownMenu>
				</div>
				<N8nText
					v-if="props.revealedToken !== null"
					size="small"
					color="warning"
					data-test-id="scim-token-copy-now"
				>
					{{ i18n.baseText('settings.scim.token.copyNow') }}
				</N8nText>
			</div>
		</template>
	</N8nSettingsRow>
</template>

<style lang="scss" module>
.tokenField {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: var(--spacing--4xs);
	width: 100%;
}

.fieldRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
}
</style>
