<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';

type Props = {
	limit: number;
	planName?: string;
};

const props = defineProps<Props>();
const visible = defineModel<boolean>();
const uiStore = useUIStore();
const locale = useI18n();

const goToUpgrade = async () => {
	await uiStore.goToUpgrade('rbac', 'upgrade-rbac');
	visible.value = false;
};
</script>
<template>
	<el-dialog
		v-model="visible"
		:title="locale.baseText('projects.settings.role.upgrade.title')"
		width="500"
	>
		<div class="pt-l">
			<i18n-t keypath="projects.settings.role.upgrade.message">
				<template #planName>{{ props.planName }}</template>
				<template #limit>
					{{
						locale.baseText('projects.create.limit', {
							adjustToNumber: props.limit,
							interpolate: { num: String(props.limit) },
						})
					}}
				</template>
			</i18n-t>
		</div>
		<template #footer>
			<N8nButton type="secondary" native-type="button" @click="visible = false">{{
				locale.baseText('generic.cancel')
			}}</N8nButton>
			<N8nButton type="primary" native-type="button" @click="goToUpgrade">{{
				locale.baseText('projects.create.limitReached.link')
			}}</N8nButton>
		</template>
	</el-dialog>
</template>
