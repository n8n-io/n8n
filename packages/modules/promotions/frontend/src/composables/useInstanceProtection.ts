import { useToast } from '@n8n/composables/useToast';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

/**
 * The protected instance setting on the Environments v2 page. It lives in the source control
 * preferences, so this is the one place to change when the setting moves to its own endpoint.
 */
export function useInstanceProtection() {
	const i18n = useI18n();
	const toast = useToast();
	const environmentsSettings = capabilityRegistry.use(capabilities.environmentsSettings);

	const busy = ref(true);
	const isProtected = computed(() => environmentsSettings.isProtected());

	async function load() {
		try {
			await environmentsSettings.loadPreferences();
			busy.value = false;
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.promotions.protected.toast.error.load'), {
				message: i18n.baseText('settings.promotions.protected.toast.error.description'),
			});
		}
	}

	async function set(value: boolean) {
		busy.value = true;
		try {
			await environmentsSettings.setProtected(value);
			toast.showMessage({
				title: i18n.baseText('settings.sourceControl.saved.title'),
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.promotions.protected.toast.error.save'), {
				message: i18n.baseText('settings.promotions.protected.toast.error.description'),
			});
		} finally {
			busy.value = false;
		}
	}

	return { busy, isProtected, load, set };
}
