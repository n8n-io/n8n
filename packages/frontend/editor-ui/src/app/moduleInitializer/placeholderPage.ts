import type { ModuleLicenseFlag } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';

/** An inactive module shows its placeholder page only while its license is off */
export const showsPlaceholderPage = (licenseFlag?: ModuleLicenseFlag) =>
	!!licenseFlag && !useSettingsStore().isEnterpriseFeatureEnabled[licenseFlag];
