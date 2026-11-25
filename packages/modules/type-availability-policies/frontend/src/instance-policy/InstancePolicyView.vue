<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import {
	N8nPreviewBadge,
	N8nSegmentControl,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { createReusableTemplate } from '@vueuse/core';
import { computed, onMounted, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import CredentialTypesTab from './CredentialTypesTab.vue';
import CredentialTypeAccessDialog from './access-dialog/CredentialTypeAccessDialog.vue';
import NodeTypeAccessDialog from './access-dialog/NodeTypeAccessDialog.vue';
import NodeTypesTab from './NodeTypesTab.vue';
import { useInstancePolicy } from './useInstancePolicy';
import { usePolicyAdminAccess } from '../composables/usePolicyAdminAccess';
import {
	INSTANCE_POLICY_DOCS_URL,
	POLICIES_LANDING_VIEW,
	POLICY_TAB_LABEL_KEY,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { manageableKinds, entryRouteName } = usePolicyAdminAccess();
const instancePolicy = useInstancePolicy();
// The tabs sit in the table's toolbar, so a tab with a table renders them there.
const [DefineTabs, ReuseTabs] = createReusableTemplate();

const tabOptions = computed(() =>
	manageableKinds.value.map((kind) => ({
		value: kind,
		label: i18n.baseText(POLICY_TAB_LABEL_KEY[kind]),
	})),
);

// The tab lives in the query so that a link can open the Credentials tab directly.
const activeTab = computed<RestrictedTypeKind | undefined>({
	get: () => {
		const requested = route.query.tab;
		return manageableKinds.value.find((kind) => kind === requested) ?? manageableKinds.value[0];
	},
	set: (tab) => {
		// The open dialog belongs to the tab, so another tab closes it.
		void router.replace({ query: { ...queryWithoutDetails(), tab } });
	},
});

// The open dialog lives in the query, as `?details=<type name>&tab=<kind>`, so a link can open it.
// A link without a tab names a node type. A link to a tab that the user cannot see opens nothing,
// because the fallback tab is of another kind.
const details = computed(() => {
	const { details: name, tab = 'node' } = route.query;
	return typeof name === 'string' && name && tab === activeTab.value
		? { kind: activeTab.value, name }
		: undefined;
});

// Only one tab renders at a time, so both share this ref.
const tab = useTemplateRef<InstanceType<typeof NodeTypesTab | typeof CredentialTypesTab>>('tab');

function openDetails(name: string) {
	void router.replace({ query: { ...route.query, tab: activeTab.value, details: name } });
}

function queryWithoutDetails() {
	const { details: _closed, ...query } = route.query;
	return query;
}

// The dialog's close focus runs after `details` no longer names it, so the close keeps the name.
let closedType: string | undefined;

function closeDetails() {
	closedType = details.value?.name;
	void router.replace({ query: queryWithoutDetails() });
}

// The dialog would return the focus later, to the element that had it when the dialog opened. A
// change of access can take that row out of the filtered table by then, and a link has no such element.
function onDialogCloseAutoFocus(event: Event) {
	event.preventDefault();
	tab.value?.returnFocus(closedType);
}

// The server lists every type of a kind, so the dialog of a name that it does not list closes. The
// access from an earlier visit can miss types installed since, so only a read of this visit decides.
const accessBeforeVisit = { ...instancePolicy.typeAccess };
const detailsTypeUnknown = computed(() => {
	if (!details.value) return false;
	const access = instancePolicy.typeAccess[details.value.kind];
	return (
		!!access &&
		access !== accessBeforeVisit[details.value.kind] &&
		!access.types.has(details.value.name)
	);
});

watch(
	detailsTypeUnknown,
	(unknown) => {
		if (unknown) closeDetails();
	},
	{ immediate: true },
);

// A user who skips the landing page on the way in goes back to Policies.
const back = computed(() =>
	entryRouteName.value === POLICIES_LANDING_VIEW
		? {
				name: POLICIES_LANDING_VIEW,
				label: i18n.baseText('typeAvailabilityPolicies.instancePolicy.back'),
			}
		: {
				name: VIEWS.SECURITY_SETTINGS,
				label: i18n.baseText('typeAvailabilityPolicies.backToPolicies'),
			},
);

function onBack() {
	void router.push({ name: back.value.name });
}

onMounted(() => {
	documentTitle.set(i18n.baseText('typeAvailabilityPolicies.instancePolicy.title'));
	void instancePolicy.load();
});
</script>

<template>
	<N8nSettingsLayout
		show-back
		:back-label="back.label"
		:class="$style.layout"
		data-test-id="instance-policy-view"
		@back="onBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('typeAvailabilityPolicies.instancePolicy.title')"
			:description="i18n.baseText('typeAvailabilityPolicies.instancePolicy.description')"
			:docs-url="INSTANCE_POLICY_DOCS_URL"
		>
			<template #titleTrailing>
				<N8nPreviewBadge size="xsmall" data-test-id="instance-policy-preview-badge" />
			</template>
		</N8nSettingsPageHeader>
		<DefineTabs>
			<N8nSegmentControl
				v-model="activeTab"
				:options="tabOptions"
				size="xlarge"
				data-test-id="instance-policy-tabs"
			/>
		</DefineTabs>
		<CredentialTypesTab v-if="activeTab === 'credential'" ref="tab" @open="openDetails">
			<template #toolbar-start>
				<ReuseTabs />
			</template>
		</CredentialTypesTab>
		<NodeTypesTab v-else-if="activeTab === 'node'" ref="tab" @open="openDetails">
			<template #toolbar-start>
				<ReuseTabs />
			</template>
		</NodeTypesTab>
		<NodeTypeAccessDialog
			v-if="details?.kind === 'node'"
			open
			:node-type="details.name"
			@update:open="closeDetails"
			@close-auto-focus="onDialogCloseAutoFocus"
		/>
		<CredentialTypeAccessDialog
			v-else-if="details?.kind === 'credential'"
			open
			:credential-type="details.name"
			@update:open="closeDetails"
			@close-auto-focus="onDialogCloseAutoFocus"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '../settings-subpage';

/* Doubled to win over the layout's own rules: the policy table needs the full page width, and the
   design keeps the tabs close to the header. */
.layout.layout {
	--settings-content--max-width: none;

	:global(header) + * {
		margin-block-start: var(--spacing--lg);
	}
}

.layout {
	@include settings-subpage.layout;
}
</style>
