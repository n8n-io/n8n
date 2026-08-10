<script setup lang="ts">
import type { TrustedKeySource, TrustedKeySourcePolicy } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogClose,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nOption,
	N8nSelect,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
	source: TrustedKeySource | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
	save: [id: string, policy: TrustedKeySourcePolicy];
}>();

const i18n = useI18n();

/**
 * `requireVerifiedEmail` is the one field a checkbox can't express: the policy
 * is tri-state everywhere — no override, or an explicit value — and "unchecked"
 * would silently mean "override to false".
 */
type VerifiedEmailChoice = 'inherit' | 'required' | 'not-required';

const inboundAudiences = ref<string[]>([]);
const expectedAudience = ref('');
const subjectClaim = ref('');
const allowedRoles = ref<string[]>([]);
const requireVerifiedEmail = ref<VerifiedEmailChoice>('inherit');

/**
 * What the source resolved to without an override, shown as placeholder text so
 * an admin can see the value they're about to replace.
 */
type JwksConfig = Extract<TrustedKeySource, { type: 'jwks' }>['config'];

const derived = computed<Partial<JwksConfig>>(() => {
	const config = props.source?.config;
	if (!config || Array.isArray(config)) {
		// A static source groups every env-configured key under one row, so
		// there is no single derived value to point at.
		return {};
	}
	return config;
});

const derivedInboundAudiences = computed(() => derived.value.inboundAudiences?.join(', ') ?? '');

/**
 * An SSO source has one job — validating tokens from the instance's identity
 * provider — so it only needs the three settings that decide whether such a
 * token is accepted and who it resolves to. The other two belong to the
 * token-exchange grant and to key-scoped role limits, which an admin
 * configuring their IdP is not thinking about; showing a second "audience"
 * field beside the inbound one mostly invites filling in the wrong one.
 *
 * They stay visible whenever a value is already set, though. The form rebuilds
 * the policy from its inputs, so a hidden field holding a value would be
 * dropped on the next save.
 */
const isSsoManaged = computed(() => props.source?.managedBy === 'sso-derived');

const showExchangeAudience = computed(
	() => !isSsoManaged.value || Boolean(props.source?.policy?.expectedAudience),
);

const showAllowedRoles = computed(
	() => !isSsoManaged.value || (props.source?.policy?.allowedRoles?.length ?? 0) > 0,
);

/**
 * Every inline key from `N8N_TRUSTED_KEYS` is grouped under a single static
 * row, and an override is applied to all of a source's keys — so on this row
 * it is a blanket change across keys that may each carry their own issuer,
 * audience and roles.
 */
const isGroupedStatic = computed(() => props.source?.type === 'static');

function reset(source: TrustedKeySource | null) {
	const policy = source?.policy ?? {};
	inboundAudiences.value = policy.inboundAudiences ?? [];
	expectedAudience.value = policy.expectedAudience ?? '';
	subjectClaim.value = policy.subjectClaim ?? '';
	allowedRoles.value = policy.allowedRoles ?? [];
	requireVerifiedEmail.value =
		policy.requireVerifiedEmail === undefined
			? 'inherit'
			: policy.requireVerifiedEmail
				? 'required'
				: 'not-required';
}

watch(
	() => [props.source, open.value] as const,
	([source]) => reset(source),
	{ immediate: true },
);

function onSave() {
	if (!props.source) return;

	// An empty field is an absent override, not an override to empty — that is
	// what lets an admin hand a setting back to the discovery document.
	const policy: TrustedKeySourcePolicy = {
		...(inboundAudiences.value.length > 0 ? { inboundAudiences: inboundAudiences.value } : {}),
		...(expectedAudience.value.trim() ? { expectedAudience: expectedAudience.value.trim() } : {}),
		...(subjectClaim.value.trim() ? { subjectClaim: subjectClaim.value.trim() } : {}),
		...(allowedRoles.value.length > 0 ? { allowedRoles: allowedRoles.value } : {}),
		...(requireVerifiedEmail.value === 'inherit'
			? {}
			: { requireVerifiedEmail: requireVerifiedEmail.value === 'required' }),
	};

	emit('save', props.source.id, policy);
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="i18n.baseText('settings.trustedKeySources.policy.title')"
		:description="i18n.baseText('settings.trustedKeySources.policy.description')"
		size="medium"
	>
		<div :class="$style.form" data-test-id="trusted-key-source-policy-modal">
			<N8nNotice
				theme="info"
				:content="i18n.baseText('settings.trustedKeySources.policy.notice')"
			/>
			<N8nNotice
				v-if="isGroupedStatic"
				theme="warning"
				:content="i18n.baseText('settings.trustedKeySources.policy.staticWarning')"
			/>

			<N8nInputLabel
				:label="i18n.baseText('settings.trustedKeySources.policy.inboundAudiences')"
				:tooltip-text="i18n.baseText('settings.trustedKeySources.policy.inboundAudiencesHint')"
				size="small"
			>
				<N8nSelect
					v-model="inboundAudiences"
					multiple
					filterable
					allow-create
					default-first-option
					:teleported="false"
					:placeholder="
						derivedInboundAudiences ||
						i18n.baseText('settings.trustedKeySources.policy.inboundAudiencesPlaceholder')
					"
					data-test-id="trusted-key-source-policy-inbound-audiences"
				>
					<N8nOption
						v-for="audience in inboundAudiences"
						:key="audience"
						:label="audience"
						:value="audience"
					/>
				</N8nSelect>
			</N8nInputLabel>

			<N8nInputLabel
				v-if="showExchangeAudience"
				:label="i18n.baseText('settings.trustedKeySources.policy.expectedAudience')"
				:tooltip-text="i18n.baseText('settings.trustedKeySources.policy.expectedAudienceHint')"
				size="small"
			>
				<N8nInput
					v-model="expectedAudience"
					:placeholder="
						derived.expectedAudience ??
						i18n.baseText('settings.trustedKeySources.policy.inheritPlaceholder')
					"
					data-test-id="trusted-key-source-policy-expected-audience"
				/>
			</N8nInputLabel>

			<N8nInputLabel
				:label="i18n.baseText('settings.trustedKeySources.policy.subjectClaim')"
				:tooltip-text="i18n.baseText('settings.trustedKeySources.policy.subjectClaimHint')"
				size="small"
			>
				<N8nInput
					v-model="subjectClaim"
					:placeholder="
						derived.subjectClaim ??
						i18n.baseText('settings.trustedKeySources.policy.subjectClaimPlaceholder')
					"
					data-test-id="trusted-key-source-policy-subject-claim"
				/>
			</N8nInputLabel>

			<N8nInputLabel
				:label="i18n.baseText('settings.trustedKeySources.policy.requireVerifiedEmail')"
				:tooltip-text="i18n.baseText('settings.trustedKeySources.policy.requireVerifiedEmailHint')"
				size="small"
			>
				<N8nSelect
					v-model="requireVerifiedEmail"
					:teleported="false"
					data-test-id="trusted-key-source-policy-require-verified-email"
				>
					<N8nOption
						value="inherit"
						:label="i18n.baseText('settings.trustedKeySources.policy.verifiedEmail.inherit')"
					/>
					<N8nOption
						value="required"
						:label="i18n.baseText('settings.trustedKeySources.policy.verifiedEmail.required')"
					/>
					<N8nOption
						value="not-required"
						:label="i18n.baseText('settings.trustedKeySources.policy.verifiedEmail.notRequired')"
					/>
				</N8nSelect>
			</N8nInputLabel>

			<N8nInputLabel
				v-if="showAllowedRoles"
				:label="i18n.baseText('settings.trustedKeySources.policy.allowedRoles')"
				:tooltip-text="i18n.baseText('settings.trustedKeySources.policy.allowedRolesHint')"
				size="small"
			>
				<N8nSelect
					v-model="allowedRoles"
					multiple
					filterable
					allow-create
					default-first-option
					:teleported="false"
					:placeholder="i18n.baseText('settings.trustedKeySources.policy.allowedRolesPlaceholder')"
					data-test-id="trusted-key-source-policy-allowed-roles"
				>
					<N8nOption v-for="role in allowedRoles" :key="role" :label="role" :value="role" />
				</N8nSelect>
			</N8nInputLabel>

			<N8nDialogFooter>
				<N8nDialogClose as-child>
					<N8nButton
						variant="outline"
						:label="i18n.baseText('generic.cancel')"
						data-test-id="trusted-key-source-policy-cancel"
					/>
				</N8nDialogClose>
				<N8nButton
					variant="solid"
					:label="i18n.baseText('generic.save')"
					data-test-id="trusted-key-source-policy-save"
					@click="onSave"
				/>
			</N8nDialogFooter>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
