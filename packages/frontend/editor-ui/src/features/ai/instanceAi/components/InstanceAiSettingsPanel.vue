<script lang="ts" setup>
import { watch, computed } from 'vue';
import {
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputNumber,
	N8nSelect,
	N8nOption,
	N8nInputLabel,
} from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import type { InstanceAiSettingsResponse, InstanceAiSettingsUpdateRequest } from '@n8n/api-types';

const emit = defineEmits<{ close: [] }>();
const i18n = useI18n();
const store = useInstanceAiSettingsStore();

watch(
	() => store.settings,
	(val) => {
		if (!val) void store.fetch();
	},
	{ immediate: true },
);

// Type-safe field accessors — read from draft (if changed) or server state
type StringField = keyof {
	[K in keyof InstanceAiSettingsResponse as InstanceAiSettingsResponse[K] extends string
		? K
		: never]: true;
};
type NumberField = keyof {
	[K in keyof InstanceAiSettingsResponse as InstanceAiSettingsResponse[K] extends number
		? K
		: never]: true;
};
type BoolField = keyof {
	[K in keyof InstanceAiSettingsResponse as InstanceAiSettingsResponse[K] extends boolean
		? K
		: never]: true;
};

function getString(key: StringField & keyof InstanceAiSettingsUpdateRequest): string {
	const draftVal = store.draft[key];
	if (draftVal !== undefined) return String(draftVal);
	return store.settings?.[key] ?? '';
}

function getNumber(key: NumberField & keyof InstanceAiSettingsUpdateRequest): number {
	const draftVal = store.draft[key];
	if (draftVal !== undefined) return Number(draftVal);
	return store.settings?.[key] ?? 0;
}

function getBool(key: BoolField & keyof InstanceAiSettingsUpdateRequest): boolean {
	const draftVal = store.draft[key];
	if (draftVal !== undefined) return Boolean(draftVal);
	return store.settings?.[key] ?? false;
}

const selectedCredentialId = computed(() => {
	if (store.draft.credentialId !== undefined) return store.draft.credentialId ?? '';
	return store.settings?.credentialId ?? '';
});

function handleCredentialChange(value: string | number | boolean | null) {
	store.setField('credentialId', value ? String(value) : null);
}

const showDaytonaFields = computed(() => {
	const provider = store.draft.sandboxProvider ?? store.settings?.sandboxProvider ?? 'daytona';
	return provider === 'daytona';
});
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="cog" size="small" />
				<span>{{ i18n.baseText('instanceAi.settings.title') }}</span>
			</div>
			<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
		</div>

		<div :class="$style.body">
			<div v-if="store.isLoading" :class="$style.loading">
				<N8nIcon icon="spinner" spin />
			</div>
			<div v-else-if="store.settings" :class="$style.sections">
				<!-- Model -->
				<div :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nIcon icon="robot" size="small" />
						{{ i18n.baseText('instanceAi.settings.section.model') }}
					</div>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.credential.label')"
						:bold="false"
						size="small"
					>
						<N8nSelect
							:model-value="selectedCredentialId"
							size="small"
							:placeholder="i18n.baseText('instanceAi.settings.credential.placeholder')"
							@update:model-value="handleCredentialChange"
						>
							<N8nOption value="" :label="i18n.baseText('instanceAi.settings.credential.none')" />
							<N8nOption
								v-for="cred in store.credentials"
								:key="cred.id"
								:value="cred.id"
								:label="`${cred.name} (${cred.provider})`"
							/>
						</N8nSelect>
					</N8nInputLabel>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.modelName.label')"
						:bold="false"
						size="small"
					>
						<N8nInput
							:model-value="getString('modelName')"
							size="small"
							:placeholder="i18n.baseText('instanceAi.settings.modelName.placeholder')"
							@update:model-value="store.setField('modelName', $event)"
						/>
					</N8nInputLabel>
				</div>

				<!-- Memory -->
				<div :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nIcon icon="brain" size="small" />
						{{ i18n.baseText('instanceAi.settings.section.memory') }}
					</div>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.lastMessages.label')"
						:bold="false"
						size="small"
					>
						<N8nInputNumber
							:model-value="getNumber('lastMessages') ?? 20"
							size="small"
							:min="1"
							@update:model-value="store.setField('lastMessages', $event ?? 20)"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.embedderModel.label')"
						:bold="false"
						size="small"
					>
						<N8nInput
							:model-value="getString('embedderModel')"
							size="small"
							:placeholder="i18n.baseText('instanceAi.settings.embedderModel.placeholder')"
							@update:model-value="store.setField('embedderModel', $event)"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.semanticRecallTopK.label')"
						:bold="false"
						size="small"
					>
						<N8nInputNumber
							:model-value="getNumber('semanticRecallTopK') ?? 5"
							size="small"
							:min="0"
							@update:model-value="store.setField('semanticRecallTopK', $event ?? 5)"
						/>
					</N8nInputLabel>
				</div>

				<!-- Sandbox -->
				<div :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nIcon icon="box" size="small" />
						{{ i18n.baseText('instanceAi.settings.section.sandbox') }}
					</div>

					<div :class="$style.switchRow">
						<span :class="$style.switchLabel">{{
							i18n.baseText('instanceAi.settings.sandboxEnabled.label')
						}}</span>
						<ElSwitch
							:model-value="getBool('sandboxEnabled')"
							@update:model-value="store.setField('sandboxEnabled', Boolean($event))"
						/>
					</div>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.sandboxProvider.label')"
						:bold="false"
						size="small"
					>
						<N8nSelect
							:model-value="getString('sandboxProvider') || 'daytona'"
							size="small"
							@update:model-value="store.setField('sandboxProvider', String($event))"
						>
							<N8nOption value="daytona" label="Daytona" />
							<N8nOption value="local" label="Local" />
						</N8nSelect>
					</N8nInputLabel>

					<template v-if="showDaytonaFields">
						<N8nInputLabel
							:label="i18n.baseText('instanceAi.settings.daytonaApiUrl.label')"
							:bold="false"
							size="small"
						>
							<N8nInput
								:model-value="getString('daytonaApiUrl')"
								size="small"
								@update:model-value="store.setField('daytonaApiUrl', $event)"
							/>
						</N8nInputLabel>

						<N8nInputLabel :bold="false" size="small">
							<template #label>
								<div :class="$style.labelWithBadge">
									{{ i18n.baseText('instanceAi.settings.daytonaApiKey.label') }}
									<span
										:class="[
											$style.badge,
											store.settings.hasDaytonaApiKey ? $style.badgeSet : $style.badgeUnset,
										]"
									>
										{{
											store.settings.hasDaytonaApiKey
												? i18n.baseText('instanceAi.settings.apiKey.set')
												: i18n.baseText('instanceAi.settings.apiKey.notSet')
										}}
									</span>
								</div>
							</template>
							<N8nInput
								:model-value="store.draft.daytonaApiKey ?? ''"
								size="small"
								type="password"
								placeholder="••••••••"
								@update:model-value="store.setField('daytonaApiKey', $event)"
							/>
						</N8nInputLabel>
					</template>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.sandboxImage.label')"
						:bold="false"
						size="small"
					>
						<N8nInput
							:model-value="getString('sandboxImage')"
							size="small"
							@update:model-value="store.setField('sandboxImage', $event)"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.sandboxTimeout.label')"
						:bold="false"
						size="small"
					>
						<N8nInputNumber
							:model-value="getNumber('sandboxTimeout') ?? 300000"
							size="small"
							:min="0"
							:step="10000"
							@update:model-value="store.setField('sandboxTimeout', $event ?? 300000)"
						/>
					</N8nInputLabel>
				</div>

				<!-- Search -->
				<div :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nIcon icon="search" size="small" />
						{{ i18n.baseText('instanceAi.settings.section.search') }}
					</div>

					<N8nInputLabel :bold="false" size="small">
						<template #label>
							<div :class="$style.labelWithBadge">
								{{ i18n.baseText('instanceAi.settings.braveSearchApiKey.label') }}
								<span
									:class="[
										$style.badge,
										store.settings.hasBraveSearchApiKey ? $style.badgeSet : $style.badgeUnset,
									]"
								>
									{{
										store.settings.hasBraveSearchApiKey
											? i18n.baseText('instanceAi.settings.apiKey.set')
											: i18n.baseText('instanceAi.settings.apiKey.notSet')
									}}
								</span>
							</div>
						</template>
						<N8nInput
							:model-value="store.draft.braveSearchApiKey ?? ''"
							size="small"
							type="password"
							placeholder="••••••••"
							@update:model-value="store.setField('braveSearchApiKey', $event)"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.searxngUrl.label')"
						:bold="false"
						size="small"
					>
						<N8nInput
							:model-value="getString('searxngUrl')"
							size="small"
							@update:model-value="store.setField('searxngUrl', $event)"
						/>
					</N8nInputLabel>
				</div>

				<!-- Advanced -->
				<div :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nIcon icon="sliders-horizontal" size="small" />
						{{ i18n.baseText('instanceAi.settings.section.advanced') }}
					</div>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.timeout.label')"
						:bold="false"
						size="small"
					>
						<N8nInputNumber
							:model-value="getNumber('timeout') ?? 120000"
							size="small"
							:min="0"
							:step="10000"
							@update:model-value="store.setField('timeout', $event ?? 120000)"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.subAgentMaxSteps.label')"
						:bold="false"
						size="small"
					>
						<N8nInputNumber
							:model-value="getNumber('subAgentMaxSteps') ?? 100"
							size="small"
							:min="1"
							@update:model-value="store.setField('subAgentMaxSteps', $event ?? 100)"
						/>
					</N8nInputLabel>

					<div :class="$style.switchRow">
						<span :class="$style.switchLabel">{{
							i18n.baseText('instanceAi.settings.browserMcp.label')
						}}</span>
						<ElSwitch
							:model-value="getBool('browserMcp')"
							@update:model-value="store.setField('browserMcp', Boolean($event))"
						/>
					</div>

					<N8nInputLabel
						:label="i18n.baseText('instanceAi.settings.mcpServers.label')"
						:bold="false"
						size="small"
					>
						<N8nInput
							:model-value="getString('mcpServers')"
							size="small"
							type="textarea"
							:rows="3"
							:placeholder="i18n.baseText('instanceAi.settings.mcpServers.placeholder')"
							@update:model-value="store.setField('mcpServers', $event)"
						/>
					</N8nInputLabel>
				</div>
				<!-- Permissions -->
				<div :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nIcon icon="shield" size="small" />
						{{ i18n.baseText('instanceAi.settings.section.permissions') }}
					</div>

					<div :class="$style.permissionDescription">
						{{ i18n.baseText('instanceAi.settings.permissions.description') }}
					</div>

					<div :class="$style.switchRow">
						<span :class="$style.switchLabel">{{
							i18n.baseText('instanceAi.settings.permissions.runWorkflow.label')
						}}</span>
						<ElSwitch
							:model-value="store.getPermission('runWorkflow') === 'always_allow'"
							@update:model-value="
								store.setPermission('runWorkflow', $event ? 'always_allow' : 'require_approval')
							"
						/>
					</div>

					<div :class="$style.switchRow">
						<span :class="$style.switchLabel">{{
							i18n.baseText('instanceAi.settings.permissions.activateWorkflow.label')
						}}</span>
						<ElSwitch
							:model-value="store.getPermission('activateWorkflow') === 'always_allow'"
							@update:model-value="
								store.setPermission(
									'activateWorkflow',
									$event ? 'always_allow' : 'require_approval',
								)
							"
						/>
					</div>

					<div :class="$style.switchRow">
						<span :class="$style.switchLabel">{{
							i18n.baseText('instanceAi.settings.permissions.deleteWorkflow.label')
						}}</span>
						<ElSwitch
							:model-value="store.getPermission('deleteWorkflow') === 'always_allow'"
							@update:model-value="
								store.setPermission('deleteWorkflow', $event ? 'always_allow' : 'require_approval')
							"
						/>
					</div>

					<div :class="$style.switchRow">
						<span :class="$style.switchLabel">{{
							i18n.baseText('instanceAi.settings.permissions.deleteCredential.label')
						}}</span>
						<ElSwitch
							:model-value="store.getPermission('deleteCredential') === 'always_allow'"
							@update:model-value="
								store.setPermission(
									'deleteCredential',
									$event ? 'always_allow' : 'require_approval',
								)
							"
						/>
					</div>
				</div>
			</div>
		</div>

		<div :class="$style.footer">
			<button
				:class="$style.resetButton"
				:disabled="!store.isDirty || store.isSaving"
				@click="store.reset()"
			>
				{{ i18n.baseText('instanceAi.settings.reset') }}
			</button>
			<button
				:class="$style.saveButton"
				:disabled="!store.isDirty || store.isSaving"
				@click="store.save()"
			>
				{{ store.isSaving ? '...' : i18n.baseText('instanceAi.settings.save') }}
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 400px;
	background: var(--color--background);
	border-left: var(--border);
	display: flex;
	flex-direction: column;
	z-index: 10;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--sm);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--tint-1);
}

.sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	padding-bottom: var(--spacing--4xs);
	border-bottom: var(--border);
}

.permissionDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) 0;
}

.switchLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.labelWithBadge {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.badge {
	font-size: var(--font-size--3xs);
	padding: 1px var(--spacing--4xs);
	border-radius: var(--radius--sm);
	font-weight: var(--font-weight--bold);
	line-height: 1.4;
}

.badgeSet {
	background: color-mix(in srgb, var(--color--success) 15%, transparent);
	color: var(--color--success);
}

.badgeUnset {
	background: var(--color--foreground);
	color: var(--color--text);
}

.footer {
	display: flex;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
	flex-shrink: 0;
}

.resetButton {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text--tint-1);

	&:hover:not(:disabled) {
		background: var(--color--background--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.saveButton {
	padding: var(--spacing--4xs) var(--spacing--sm);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: none;
	background: var(--color--primary);
	color: white;

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}
</style>
