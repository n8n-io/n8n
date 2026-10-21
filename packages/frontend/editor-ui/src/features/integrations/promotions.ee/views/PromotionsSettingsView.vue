<script setup lang="ts">
import { promotionDirectionSchema, type PromotionDirection } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nEmptyState,
	N8nExternalLink,
	N8nLoading2,
	N8nPreviewBadge,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { nextTick, onMounted, ref, type ComponentPublicInstance } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useLatestFetch } from '@/app/composables/useLatestFetch';
import { MODAL_CONFIRM } from '@/app/constants';
import PromotionEnvironmentCard from '../components/PromotionEnvironmentCard.vue';
import { invalidateInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import { usePromotionCheckout } from '../composables/usePromotionCheckout';
import {
	PROMOTIONS_ENVIRONMENT_ADD_VIEW,
	PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
} from '../promotions.constants';
import {
	deletePromotionEnvironment,
	deleteProviderIfUnused,
	fetchPromotionEnvironment,
	fetchPromotionEnvironments,
	type PromotionEnvironment,
} from '../promotionsSettings.api';

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const router = useRouter();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle();
const { next: nextLoad } = useLatestFetch();
const { connectErrors, canClone, connect } = usePromotionCheckout();

const environments = ref<Partial<Record<PromotionDirection, PromotionEnvironment>>>({});
const isInitialLoading = ref(true);
const loadError = ref(false);
const busy = ref<{ id: string; action: 'retry' | 'remove' }>();
const addButtons: Partial<Record<PromotionDirection, Element | ComponentPublicInstance | null>> =
	{};

async function load() {
	const isLatestLoad = nextLoad();
	loadError.value = false;
	try {
		const context = rootStore.publicApiContext;
		const summaries = await fetchPromotionEnvironments(context, { scope: 'instance' });
		const details = await Promise.all(
			summaries.map(async ({ id }) => await fetchPromotionEnvironment(context, id)),
		);
		if (!isLatestLoad()) return;
		environments.value = Object.fromEntries(details.map((detail) => [detail.direction, detail]));
	} catch (error) {
		if (!isLatestLoad()) return;
		loadError.value = true;
		toast.showError(error, i18n.baseText('settings.promotions.environments.error.title'));
	} finally {
		if (isLatestLoad()) isInitialLoading.value = false;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.promotions.title'));
	await load();
});

async function retry(environment: PromotionEnvironment) {
	busy.value = { id: environment.id, action: 'retry' };
	if (await connect(environment.id)) await load();
	busy.value = undefined;
}

async function remove(environment: PromotionEnvironment) {
	const confirmed = await message.confirm(
		i18n.baseText('settings.promotions.environment.remove.confirm.message', {
			interpolate: { name: environment.name },
		}),
		i18n.baseText('settings.promotions.environment.remove.confirm.title'),
		{
			confirmButtonText: i18n.baseText('settings.promotions.environment.remove.confirm.button'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			customClass: 'el-message-box--destructive',
			showClose: true,
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;

	const context = rootStore.publicApiContext;
	busy.value = { id: environment.id, action: 'remove' };
	try {
		await deletePromotionEnvironment(context, environment.id);
	} catch (error) {
		if (!(error instanceof ResponseError && error.httpStatusCode === 404)) {
			busy.value = undefined;
			toast.showError(error, i18n.baseText('settings.promotions.environment.toast.error.remove'));
			return;
		}
	}
	try {
		await deleteProviderIfUnused(context, environment.provider.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.provider.toast.error.delete'));
	}
	connectErrors.delete(environment.id);
	invalidateInstancePromotionConnection();
	await load();
	busy.value = undefined;
	toast.showMessage({
		title: i18n.baseText('settings.promotions.environment.toast.removed', {
			interpolate: { name: environment.name },
		}),
		type: 'success',
	});
	await nextTick();
	const addButton = addButtons[environment.direction];
	if (addButton && '$el' in addButton && addButton.$el instanceof HTMLElement)
		addButton.$el.focus();
}
</script>

<template>
	<N8nSettingsLayout :class="$style.layout">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.promotions.title')"
			:description="i18n.baseText('settings.promotions.description')"
			:show-docs-link="false"
		>
			<template #titleTrailing>
				<N8nPreviewBadge size="xsmall" />
			</template>
		</N8nSettingsPageHeader>

		<N8nSettingsSection :title="i18n.baseText('settings.promotions.environments.title')">
			<template #description>
				<N8nText size="small" color="text-base">
					<I18nT keypath="settings.promotions.environments.description" tag="span" scope="global">
						<template #environments>
							<!-- FIXME: link to the environments docs page once it exists. -->
							<N8nExternalLink inline size="small" href="#">{{
								i18n.baseText('settings.promotions.environments.description.link')
							}}</N8nExternalLink>
						</template>
					</I18nT>
				</N8nText>
			</template>
			<N8nLoading2 v-if="isInitialLoading" :rows="2" :shrink-last="false" />
			<N8nEmptyState
				v-else-if="loadError"
				:heading="i18n.baseText('settings.promotions.environments.error.title')"
				:description="i18n.baseText('settings.promotions.environments.error.description')"
				:button-text="i18n.baseText('generic.retry')"
				data-test-id="promotion-environments-load-error"
				@click:button="load"
			/>
			<N8nSettingsRowGroup v-else>
				<div :class="$style.columns">
					<template v-for="direction in promotionDirectionSchema.options" :key="direction">
						<PromotionEnvironmentCard
							v-if="environments[direction]"
							:key="environments[direction].id"
							:class="$style.column"
							:environment="environments[direction]"
							:busy="busy?.id === environments[direction].id ? busy.action : undefined"
							:connect-error="connectErrors.get(environments[direction].id)"
							:can-clone="canClone"
							:data-test-id="`promotion-environment-card-${direction}`"
							@retry="retry(environments[direction])"
							@edit="
								router.push({
									name: PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
									params: { environmentId: environments[direction].id },
								})
							"
							@remove="remove(environments[direction])"
						/>
						<div v-else :class="$style.column">
							<N8nSettingsRow
								:title="i18n.baseText(`settings.promotions.environments.${direction}.title`)"
								:show-divider="false"
							/>
							<div :class="$style.empty">
								<N8nButton
									:ref="(button) => (addButtons[direction] = button)"
									variant="outline"
									icon="plus"
									:data-test-id="`promotion-environment-add-${direction}`"
									@click="
										router.push({ name: PROMOTIONS_ENVIRONMENT_ADD_VIEW, params: { direction } })
									"
								>
									{{ i18n.baseText('settings.promotions.environments.add') }}
								</N8nButton>
							</div>
						</div>
					</template>
				</div>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

.layout {
	container-type: inline-size;
}

.columns {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));

	@container (max-width: #{$breakpoint-2xs}) {
		grid-template-columns: minmax(0, 1fr);
	}
}

.column {
	display: flex;
	flex-direction: column;

	& + & {
		border-inline-start: var(--border-width, 1px) solid var(--border-color--subtle);

		@container (max-width: #{$breakpoint-2xs}) {
			border-inline-start: none;
			border-block-start: var(--border-width, 1px) solid var(--border-color--subtle);
		}
	}
}

.empty {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg) var(--spacing--sm);
}
</style>
