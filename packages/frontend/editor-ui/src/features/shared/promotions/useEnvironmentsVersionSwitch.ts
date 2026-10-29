import type { EnvironmentsVersion } from '@n8n/api-types';
import { N8nExternalLink, useMessage } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, h, ref } from 'vue';
import { useRouter } from 'vue-router';

import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { PROMOTIONS_SETTINGS_VIEW } from '@/features/integrations/promotions.ee/promotions.constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

/** Moves the instance between Environments (v1) and Environments v2 after a confirmation. */
export function useEnvironmentsVersionSwitch() {
	const i18n = useI18n();
	const message = useMessage();
	const toast = useToast();
	const router = useRouter();
	const sourceControlStore = useSourceControlStore();

	/** Only an admin of an instance with a v1 repository has a classic setup to go back to. */
	const canSwitchBack = computed(
		() =>
			sourceControlStore.preferences.connected &&
			hasPermission(['rbac'], { rbac: { scope: 'sourceControl:manage' } }),
	);

	const busy = ref(false);

	async function switchTo(version: EnvironmentsVersion) {
		if (busy.value) return;
		busy.value = true;
		const keys =
			version === 'v2'
				? 'settings.sourceControl.switch.confirm'
				: 'settings.promotions.switchBack.confirm';
		// The message box mounts outside the app context, where I18nT cannot resolve the i18n
		// instance, so the hint is split around its link placeholder instead.
		const [beforeLink, afterLink] = i18n
			.baseText(`${keys}.hint` as const, { interpolate: { link: '{link}' } })
			.split('{link}');
		try {
			const confirmed = await message.confirm(
				h('div', [
					h('p', { class: 'mb-l' }, i18n.baseText(`${keys}.message` as const)),
					h('p', [
						beforeLink,
						// FIXME: link to the environments docs page once it exists.
						h(N8nExternalLink, { href: '#', inline: true, size: 'small' }, () =>
							i18n.baseText('settings.sourceControl.switch.link'),
						),
						afterLink,
					]),
				]),
				i18n.baseText(`${keys}.title` as const),
				{
					confirmButtonText: i18n.baseText(`${keys}.button` as const),
					cancelButtonText: i18n.baseText('generic.cancel'),
				},
			);
			if (confirmed !== MODAL_CONFIRM) return;
			await sourceControlStore.updatePreferences({ environmentsVersion: version });
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.sourceControl.switch.error'));
			return;
		} finally {
			busy.value = false;
		}
		await router.push({
			name: version === 'v2' ? PROMOTIONS_SETTINGS_VIEW : VIEWS.SOURCE_CONTROL,
		});
	}

	return { busy, canSwitchBack, switchTo };
}
