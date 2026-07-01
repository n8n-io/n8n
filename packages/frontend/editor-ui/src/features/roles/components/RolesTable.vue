<script setup lang="ts">
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { N8nActionToggle, N8nButton, N8nDatatable, N8nIcon, N8nText } from '@n8n/design-system';
import type { DatatableColumn } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import dateformat from 'dateformat';
import { computed, useCssModule } from 'vue';
import { RouterLink } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

type RoleAction = { label: string; value: string; disabled?: boolean };
type RoleRow = Role & { id: string };

const props = defineProps<{
	roles: Role[];
	showPaywall: boolean;
	/** Header label for the usage-count column (e.g. "Projects assigned" / "Members assigned"). */
	countColumnTitle: string;
	/** Role field backing the usage-count column ("usedByProjects" | "usedByUsers"). */
	countColumnKey: 'usedByProjects' | 'usedByUsers';
	/** Per-row actions shown for custom roles. System roles never show actions. */
	rowActions: (item: Role) => RoleAction[];
	/** Optional route for the clickable usage count. When omitted, the count renders as plain text. */
	getCountRoute?: (item: Role) => RouteLocationRaw | undefined;
}>();

const emit = defineEmits<{
	action: [value: string, item: Role];
	'row-click': [item: Role];
}>();

const i18n = useI18n();
const $style = useCssModule();
const settingsStore = useSettingsStore();
const { goToUpgrade } = usePageRedirectionHelper();

const columns = computed<DatatableColumn[]>(() => [
	{
		id: 'displayName',
		path: 'displayName',
		label: i18n.baseText('roles.table.name'),
		width: '400px',
	},
	{
		id: 'systemRole',
		path: 'systemRole',
		label: i18n.baseText('roles.table.type'),
	},
	{
		id: props.countColumnKey,
		path: props.countColumnKey,
		label: props.countColumnTitle,
	},
	{
		id: 'updatedAt',
		path: 'updatedAt',
		label: i18n.baseText('roles.table.lastEdited'),
	},
	{
		id: 'actions',
		path: 'actions',
		label: '',
		width: '50px',
	},
]);

const rows = computed<RoleRow[]>(() => props.roles.map((r) => ({ ...r, id: r.slug })));

function resolveCountRoute(row: RoleRow): RouteLocationRaw {
	return props.getCountRoute?.(row) ?? '';
}
</script>

<template>
	<div>
		<template v-if="showPaywall">
			<div :class="$style.paywallContainer">
				<div :class="$style.paywallIcons">
					<div :class="[$style.iconBox, $style.iconBoxLeft]">
						<N8nIcon icon="eye-off" :size="20" color="foreground-xdark" />
					</div>
					<div :class="[$style.iconBox, $style.iconBoxCenter]">
						<N8nIcon icon="shield-user" :size="20" color="foreground-xdark" />
					</div>
					<div :class="[$style.iconBox, $style.iconBoxRight]">
						<N8nIcon icon="pencil-off" :size="20" color="foreground-xdark" />
					</div>
				</div>
				<div :class="$style.paywallText">
					<N8nText tag="p" size="medium" :bold="true" align="center">
						{{ i18n.baseText('roles.paywall.title') }}
					</N8nText>
					<N8nText tag="p" color="text-light" align="center">
						{{ i18n.baseText('roles.paywall.description') }}
					</N8nText>
				</div>
				<div :class="$style.paywallActions">
					<N8nButton variant="outline" size="medium" :href="CUSTOM_ROLES_DOCS_URL" target="_blank">
						{{ i18n.baseText('generic.learnMore') }}
						<N8nIcon icon="external-link" size="small" />
					</N8nButton>
					<N8nButton
						variant="solid"
						size="medium"
						@click="goToUpgrade('custom-roles-list', 'upgrade-custom-roles')"
					>
						{{
							settingsStore.isCloudDeployment
								? i18n.baseText('roles.paywall.viewPlans')
								: i18n.baseText('generic.upgrade')
						}}
					</N8nButton>
				</div>
			</div>
		</template>
		<template v-else>
			<N8nDatatable :columns="columns" :rows="rows" :pagination="false">
				<template #row="{ row }">
					<tr :class="[$style.tallRow, $style.clickableRow]" @click="emit('row-click', row)">
						<td>
							<N8nText tag="div" class="mb-4xs">{{ row.displayName }}</N8nText>
							<N8nText tag="div" size="small" color="text-light">{{ row.description }}</N8nText>
						</td>
						<td>
							<template v-if="row.systemRole">
								<N8nIcon icon="lock" /> {{ i18n.baseText('roles.literal.system') }}
							</template>
							<template v-else>
								<N8nIcon icon="user-pen" /> {{ i18n.baseText('roles.literal.custom') }}
							</template>
						</td>
						<td :class="$style.countCell">
							<RouterLink
								v-if="(row[countColumnKey] ?? 0) > 0 && resolveCountRoute(row)"
								:to="resolveCountRoute(row)"
								:class="$style.countLink"
								@click.stop
							>
								{{ row[countColumnKey] }}
							</RouterLink>
							<template v-else>{{ row[countColumnKey] ?? 0 }}</template>
						</td>
						<td>
							{{
								row.updatedAt && !row.systemRole ? dateformat(row.updatedAt, 'd mmm, yyyy') : '—'
							}}
						</td>
						<td :class="$style.actionsCell">
							<N8nActionToggle
								v-if="!row.systemRole"
								:actions="rowActions(row)"
								@action="($event) => emit('action', $event, row)"
							/>
						</td>
					</tr>
				</template>
			</N8nDatatable>
		</template>
	</div>
</template>

<style lang="css" module>
.paywallContainer {
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing--3xl);
	gap: var(--spacing--lg);
}

.paywallIcons {
	display: flex;
	align-items: center;
	justify-content: center;
}

.iconBox {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	background: var(--color--foreground--tint-2);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	box-shadow:
		0 0 0.5px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100)),
		0 3px 8px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100)),
		0 1px 3px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
}

.iconBoxLeft {
	transform: rotate(-8deg);
	margin: var(--spacing--2xs) var(--spacing--5xs) 0 0;
}

.iconBoxCenter {
	z-index: 1;
	box-shadow:
		0 0 0.5px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-200)),
		0 5px 12px 0 light-dark(var(--color--black-alpha-300), var(--color--white-alpha-200)),
		0 1px 3px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
	margin: 0 -3px;
}

.iconBoxRight {
	transform: rotate(8deg);
	margin: var(--spacing--2xs) 0 0 var(--spacing--5xs);
}

.paywallText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	text-align: center;
}

.paywallActions {
	display: flex;
	gap: var(--spacing--xs);
	align-items: center;
}

.clickableRow {
	cursor: pointer;
}

.tallRow {
	height: var(--spacing--3xl);
}

.countCell {
	text-align: right;
	width: 120px;
}

.actionsCell {
	text-align: center;
	width: 50px;
}

.countLink {
	color: var(--color--text);
	text-decoration: underline;
	font-weight: var(--font-weight--bold);
}

.countLink:hover {
	color: var(--color--primary);
}
</style>

<style scoped>
:deep(.pageSizeSelector) {
	display: none;
}
</style>
