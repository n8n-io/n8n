import { h, ref } from 'vue';
import { useMessage } from '@/app/composables/useMessage';
import { useI18n } from '@n8n/i18n';
import { N8nCheckbox } from '@n8n/design-system';
import { LOCAL_STORAGE_SKIP_DISCONNECT_CONFIRM } from '@/app/constants/localStorage';

export function useDisconnectConfirmation() {
	const message = useMessage();
	const i18n = useI18n();

	async function confirmDisconnect(): Promise<boolean> {
		if (localStorage.getItem(LOCAL_STORAGE_SKIP_DISCONNECT_CONFIRM) === 'true') {
			return true;
		}

		const skipInFuture = ref(false);

		const content = h('div', [
			h('div', { class: 'el-message-box__message__structured' }, [
				i18n.baseText('credentials.private.disconnect.dialog.message'),
			]),
			h(
				N8nCheckbox,
				{
					modelValue: skipInFuture.value,
					'onUpdate:modelValue': (v: boolean) => {
						skipInFuture.value = v;
					},
				},
				{
					label: () =>
						h('span', i18n.baseText('credentials.private.disconnect.dialog.dontShowAgain')),
				},
			),
		]);

		const result = await message.confirm(
			content,
			i18n.baseText('credentials.private.disconnect.dialog.title'),
			{
				confirmButtonText: i18n.baseText('credentials.private.disconnect.dialog.confirm'),
				confirmButtonClass: 'btn--confirm el-button--danger',
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);

		if (result !== 'confirm') {
			return false;
		}

		if (skipInFuture.value) {
			localStorage.setItem(LOCAL_STORAGE_SKIP_DISCONNECT_CONFIRM, 'true');
		}

		return true;
	}

	return { confirmDisconnect };
}
