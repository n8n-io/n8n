<script lang="ts" setup>
import { IForm } from '@/Interface';
import { useUsersStore } from '@/stores/users';
import { computed } from 'vue';
import { useI18n, useMessage } from '@/composables';
import { useFormsStore } from '@/stores';

const i18n = useI18n();
const usersStore = useUsersStore();
const { confirm } = useMessage();

const emit = defineEmits(['click', 'delete']);

const props = defineProps({
	data: {
		type: Object,
		required: true,
		default: (): IForm => ({
			id: '',
			title: '',
			slug: '',
			schema: {},
		}),
	},
	readonly: {
		type: Boolean,
		default: false,
	},
});

const FORM_LIST_ITEM_ACTIONS = {
	OPEN: 'open',
	DELETE: 'delete',
};

const currentUser = computed(() => usersStore.currentUser);

const actions = computed<Array<{ label: string; value: string }>>(() => {
	return [
		{
			label: i18n.baseText('credentials.item.open'),
			value: FORM_LIST_ITEM_ACTIONS.OPEN,
		},
	].concat([
		{
			label: i18n.baseText('credentials.item.delete'),
			value: FORM_LIST_ITEM_ACTIONS.DELETE,
		},
	]);
});

async function onClick() {
	emit('click', props.data);
}

function onAction(action: string) {
	if (action === FORM_LIST_ITEM_ACTIONS.OPEN) {
		onClick();
	} else if (action === FORM_LIST_ITEM_ACTIONS.DELETE) {
		emit('delete', props.data);
	}
}
</script>

<template>
	<n8n-card :class="$style['card-link']" @click="onClick">
		<template #header>
			<n8n-heading tag="h2" bold class="ph-no-capture" :class="$style['card-heading']">
				{{ data.title }}
			</n8n-heading>
		</template>
		<template #append>
			<div :class="$style['card-actions']">
				<n8n-action-toggle :actions="actions" theme="dark" @action="onAction" />
			</div>
		</template>
	</n8n-card>
</template>

<style lang="scss" module>
.card-link {
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.card-heading {
	font-size: var(--font-size-s);
}

.card-actions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
}
</style>
