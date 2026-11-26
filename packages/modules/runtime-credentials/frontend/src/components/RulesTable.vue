<script setup lang="ts">
import { N8nBadge, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { RuntimeCredentialRule } from '../runtime-credentials.api';
import { parseAllowedDomains, parseTransform } from '../runtime-credentials.utils';

const { rules, readonly = false } = defineProps<{
	rules: RuntimeCredentialRule[];
	/** Hides the row actions. Environment rules are always read-only. */
	readonly?: boolean;
}>();

const emit = defineEmits<{
	edit: [rule: RuntimeCredentialRule];
	delete: [rule: RuntimeCredentialRule];
}>();

const i18n = useI18n();

function transformLabel(rule: RuntimeCredentialRule): string {
	const { kind, fieldName } = parseTransform(rule.transform);
	if (kind === 'bearer') return i18n.baseText('runtimeCredentials.rules.transform.bearer');
	if (kind === 'field') {
		return i18n.baseText('runtimeCredentials.rules.transform.field', {
			interpolate: { name: fieldName },
		});
	}
	return i18n.baseText('runtimeCredentials.rules.transform.none');
}
</script>

<template>
	<table :class="$style.table" data-test-id="runtime-rules-table">
		<thead>
			<tr>
				<th>{{ i18n.baseText('runtimeCredentials.rules.table.alias') }}</th>
				<th>{{ i18n.baseText('runtimeCredentials.rules.table.nodeType') }}</th>
				<th>{{ i18n.baseText('runtimeCredentials.rules.table.path') }}</th>
				<th>{{ i18n.baseText('runtimeCredentials.rules.table.credentialType') }}</th>
				<th>{{ i18n.baseText('runtimeCredentials.rules.table.transform') }}</th>
				<th>{{ i18n.baseText('runtimeCredentials.rules.table.allowedDomains') }}</th>
				<th v-if="!readonly">
					<span class="sr-only">{{ i18n.baseText('runtimeCredentials.rules.table.actions') }}</span>
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="rule in rules" :key="rule.alias" :data-test-id="`runtime-rule-${rule.alias}`">
				<td>
					<N8nText bold>{{ rule.alias }}</N8nText>
					<N8nTooltip
						v-if="rule.source === 'environment'"
						:content="i18n.baseText('runtimeCredentials.rules.source.environment.tooltip')"
					>
						<N8nBadge variant="subtle" size="small" data-test-id="runtime-rule-env-badge">
							{{ i18n.baseText('runtimeCredentials.rules.source.environment') }}
						</N8nBadge>
					</N8nTooltip>
				</td>
				<td>
					<code>{{ rule.nodeType }}</code>
				</td>
				<td>
					<code>{{ rule.path }}</code>
				</td>
				<td>
					<code>{{ rule.credentialType }}</code>
				</td>
				<td>{{ transformLabel(rule) }}</td>
				<td :data-test-id="`runtime-rule-domains-${rule.alias}`">
					<span v-if="parseAllowedDomains(rule.allowedDomains).length > 0" :class="$style.domains">
						<N8nBadge
							v-for="domain in parseAllowedDomains(rule.allowedDomains)"
							:key="domain"
							variant="subtle"
							size="small"
							data-test-id="runtime-rule-domain"
						>
							{{ domain }}
						</N8nBadge>
					</span>
					<N8nText v-else color="text-light" data-test-id="runtime-rule-any-host">
						{{ i18n.baseText('runtimeCredentials.rules.allowedDomains.any') }}
					</N8nText>
				</td>
				<td v-if="!readonly" :class="$style.actions">
					<template v-if="rule.source === 'database'">
						<N8nIconButton
							icon="pen"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('runtimeCredentials.rules.edit')"
							data-test-id="runtime-rule-edit"
							@click="emit('edit', rule)"
						/>
						<N8nIconButton
							icon="trash-2"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('runtimeCredentials.rules.delete')"
							data-test-id="runtime-rule-delete"
							@click="emit('delete', rule)"
						/>
					</template>
				</td>
			</tr>
		</tbody>
	</table>
</template>

<style lang="scss" module>
.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--sm);
	color: var(--text-color);

	th {
		text-align: left;
		font-weight: var(--font-weight--medium);
		color: var(--text-color--subtle);
	}

	th,
	td {
		padding: var(--spacing--2xs) var(--spacing--xs);
		border-bottom: var(--border-width) var(--border-style) var(--border-color--subtle);
		vertical-align: middle;
	}

	td > * + * {
		margin-inline-start: var(--spacing--2xs);
	}
}

.domains {
	display: inline-flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.actions {
	white-space: nowrap;
	text-align: right;
}
</style>
