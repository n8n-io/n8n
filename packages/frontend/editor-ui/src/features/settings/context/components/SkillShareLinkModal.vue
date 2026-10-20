<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SkillCheckLevel, SkillCheckResult, SkillDetail } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';

import AgentModal from '@/features/agents/components/modals/AgentModal.vue';

import { useSkillsStore } from '../skills.store';
import {
	encryptPayload,
	linksFor,
	revokeOnRelay,
	saveLinks,
	shareLinkUrl,
	SkillShareError,
	uploadToRelay,
	type SkillShareLinkRecord,
} from '../skillShare';
import { checkBadgeVariant } from '../skillsGitHub.utils';

const EXPIRY_DAYS = [1, 7, 30] as const;

const props = defineProps<{
	open: boolean;
	skillId: string | null;
}>();

const emit = defineEmits<{ 'update:open': [open: boolean] }>();

const i18n = useI18n();
const skillsStore = useSkillsStore();
const usersStore = useUsersStore();
const clipboard = useClipboard();
const { showError, showMessage } = useToast();

const loading = ref(false);
const busy = ref(false);
const detail = ref<SkillDetail | null>(null);
const check = ref<SkillCheckResult | null>(null);
const acknowledged = ref(false);
const expiresInDays = ref<number>(7);
const created = ref<SkillShareLinkRecord | null>(null);
const links = ref<SkillShareLinkRecord[]>([]);

watch(
	() => [props.open, props.skillId] as const,
	async ([open, skillId]) => {
		if (!open || !skillId) return;
		detail.value = null;
		check.value = null;
		created.value = null;
		acknowledged.value = false;
		expiresInDays.value = 7;
		links.value = linksFor(skillId);
		loading.value = true;
		try {
			detail.value = await skillsStore.fetchSkill(skillId);
			const { name, description, instructions, references } = detail.value.skill;
			check.value = await skillsStore.checkSkillContent({
				name,
				description,
				instructions,
				...(references?.length ? { references } : {}),
			});
		} catch (error) {
			showError(error, i18n.baseText('settings.context.skills.share.error.load'));
			emit('update:open', false);
		} finally {
			loading.value = false;
		}
	},
	{ immediate: true },
);

const fileCount = computed(() => 1 + (detail.value?.skill.references?.length ?? 0));
const canCreate = computed(
	() =>
		!!detail.value &&
		!!check.value &&
		check.value.result !== 'blocked' &&
		(check.value.result === 'passed' || acknowledged.value),
);

function checkLabel(result: SkillCheckLevel): string {
	if (result === 'passed') return i18n.baseText('settings.context.skills.github.result.passed');
	if (result === 'review') return i18n.baseText('settings.context.skills.github.result.review');
	return i18n.baseText('settings.context.skills.github.result.blocked');
}

function authorName(): string {
	const user = usersStore.currentUser;
	return user?.fullName ?? user?.email ?? i18n.baseText('settings.context.skills.share.someone');
}

async function onCreate() {
	if (!detail.value || !canCreate.value) return;
	busy.value = true;
	try {
		const { name, description, instructions, references } = detail.value.skill;
		const { ciphertext, key } = await encryptPayload({
			format: 'n8n-skill-share/1',
			skill: { name, description, instructions, ...(references?.length ? { references } : {}) },
			source: {
				author: authorName(),
				version: detail.value.latestVersion,
				sharedAt: new Date().toISOString(),
			},
		});
		const stored = await uploadToRelay(ciphertext, expiresInDays.value);
		const record: SkillShareLinkRecord = {
			id: stored.id,
			deleteToken: stored.deleteToken,
			url: shareLinkUrl(stored.id, key),
			version: detail.value.latestVersion,
			expiresAt: stored.expiresAt,
			createdAt: new Date().toISOString(),
		};
		created.value = record;
		links.value = [record, ...links.value];
		saveLinks(detail.value.id, links.value);
	} catch (error) {
		showError(
			error,
			i18n.baseText(
				error instanceof SkillShareError && error.reason === 'relay'
					? 'settings.context.skills.share.error.relay'
					: 'settings.context.skills.share.error.create',
			),
		);
	} finally {
		busy.value = false;
	}
}

async function onCopy(url: string) {
	await clipboard.copy(url);
	showMessage({ title: i18n.baseText('settings.context.skills.share.copied'), type: 'success' });
}

async function onRevoke(link: SkillShareLinkRecord) {
	if (!detail.value) return;
	busy.value = true;
	try {
		await revokeOnRelay(link.id, link.deleteToken);
	} catch (error) {
		// A link the relay no longer knows is as good as revoked.
		if (!(error instanceof SkillShareError && error.reason === 'not_found')) {
			showError(error, i18n.baseText('settings.context.skills.share.error.revoke'));
			busy.value = false;
			return;
		}
	}
	links.value = links.value.filter((item) => item.id !== link.id);
	if (created.value?.id === link.id) created.value = null;
	saveLinks(detail.value.id, links.value);
	showMessage({ title: i18n.baseText('settings.context.skills.share.revoked'), type: 'success' });
	busy.value = false;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const title = computed(() =>
	i18n.baseText('settings.context.skills.share.title', {
		interpolate: { name: detail.value?.name ?? '' },
	}),
);
</script>

<template>
	<AgentModal
		:open="open"
		:title="title"
		:busy="busy"
		size="large"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body" data-test-id="skill-share-link-modal">
			<N8nText v-if="loading" color="text-light">
				{{ i18n.baseText('settings.context.skills.share.loading') }}
			</N8nText>

			<template v-else-if="detail && check">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.context.skills.share.intro') }}
				</N8nText>

				<div :class="$style.summary" data-test-id="skill-share-summary">
					<div :class="$style.summaryText">
						<N8nText bold>{{ detail.name }}</N8nText>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('settings.context.skills.share.summary', {
									interpolate: {
										version: String(detail.latestVersion),
										count: String(fileCount),
									},
									adjustToNumber: fileCount,
								})
							}}
						</N8nText>
					</div>
					<N8nBadge :variant="checkBadgeVariant(check.result)" data-test-id="skill-share-check">
						{{ checkLabel(check.result) }}
					</N8nBadge>
				</div>

				<ul v-if="check.findings.length" :class="$style.findings">
					<li v-for="(finding, index) in check.findings" :key="index">
						<N8nText size="small">
							<strong>{{ finding.message }}.</strong>
							{{ [finding.file, finding.detail].filter(Boolean).join(': ') }}
						</N8nText>
					</li>
				</ul>
				<N8nCallout v-if="check.result === 'blocked'" theme="danger">
					{{ i18n.baseText('settings.context.skills.share.blocked') }}
				</N8nCallout>
				<N8nCheckbox
					v-else-if="check.result === 'review' && !created"
					v-model="acknowledged"
					:label="i18n.baseText('settings.context.skills.share.ack')"
					data-test-id="skill-share-ack"
				/>

				<template v-if="created">
					<N8nInputLabel
						:label="i18n.baseText('settings.context.skills.share.link.label')"
						size="small"
					>
						<div :class="$style.linkRow">
							<N8nInput
								:model-value="created.url"
								readonly
								:class="$style.mono"
								data-test-id="skill-share-link"
							/>
							<N8nButton
								variant="solid"
								data-test-id="skill-share-copy"
								@click="onCopy(created.url)"
							>
								{{ i18n.baseText('settings.context.skills.share.copy') }}
							</N8nButton>
						</div>
					</N8nInputLabel>
					<N8nCallout theme="info">
						{{ i18n.baseText('settings.context.skills.share.keyNote') }}
					</N8nCallout>
				</template>
				<N8nInputLabel
					v-else
					:label="i18n.baseText('settings.context.skills.share.expires')"
					size="small"
				>
					<N8nSelect
						v-model="expiresInDays"
						size="large"
						:teleported="false"
						data-test-id="skill-share-expiry"
					>
						<N8nOption
							v-for="days in EXPIRY_DAYS"
							:key="days"
							:value="days"
							:label="
								i18n.baseText('settings.context.skills.share.expiresIn', {
									interpolate: { count: String(days) },
									adjustToNumber: days,
								})
							"
						/>
					</N8nSelect>
				</N8nInputLabel>

				<div v-if="links.length" :class="$style.links" data-test-id="skill-share-active-links">
					<N8nText size="small" bold>
						{{ i18n.baseText('settings.context.skills.share.active') }}
					</N8nText>
					<ul :class="$style.list">
						<li v-for="link in links" :key="link.id" :class="$style.linkItem">
							<N8nText size="small">
								{{
									i18n.baseText('settings.context.skills.share.activeItem', {
										interpolate: {
											version: String(link.version),
											created: formatDate(link.createdAt),
											expires: formatDate(link.expiresAt),
										},
									})
								}}
							</N8nText>
							<span :class="$style.spacer" />
							<N8nButton
								variant="ghost"
								size="small"
								data-test-id="skill-share-revoke"
								@click="onRevoke(link)"
							>
								{{ i18n.baseText('settings.context.skills.share.revoke') }}
							</N8nButton>
						</li>
					</ul>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.context.skills.share.revokeNote') }}
					</N8nText>
				</div>
			</template>
		</div>

		<template #footerActions>
			<N8nButton
				v-if="!created"
				variant="solid"
				:loading="busy"
				:disabled="!canCreate"
				data-test-id="skill-share-create"
				@click="onCreate"
			>
				{{ i18n.baseText('settings.context.skills.share.create') }}
			</N8nButton>
			<N8nButton v-else variant="solid" @click="emit('update:open', false)">
				{{ i18n.baseText('settings.context.skills.share.done') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.summary {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.summaryText {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.findings {
	margin: 0;
	padding-left: var(--spacing--md);
}

.linkRow {
	display: flex;
	gap: var(--spacing--2xs);
}

.mono input {
	font-family: var(--font-family--monospace);
}

.links {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	border: var(--border);
	border-radius: var(--radius);
}

.linkItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xs) var(--spacing--xs);

	& + & {
		border-top: var(--border);
	}
}

.spacer {
	flex: 1;
}
</style>
