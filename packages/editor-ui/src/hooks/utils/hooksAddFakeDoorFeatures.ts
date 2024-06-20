import { useUIStore } from '@/stores/ui.store';
import type { IFakeDoor } from '@/Interface';
import { FAKE_DOOR_FEATURES } from '@/constants';
import type { BaseTextKey } from '@/plugins/i18n';

export function compileFakeDoorFeatures(): IFakeDoor[] {
	const store = useUIStore();
	const fakeDoorFeatures: IFakeDoor[] = store.fakeDoorFeatures.map((feature) => ({ ...feature }));

	const environmentsFeature = fakeDoorFeatures.find(
		(feature) => feature.id === FAKE_DOOR_FEATURES.ENVIRONMENTS,
	);
	if (environmentsFeature) {
		environmentsFeature.actionBoxTitle += '.cloud';
		environmentsFeature.linkURL += '&edition=cloud';
	}

	const loggingFeature = fakeDoorFeatures.find(
		(feature) => feature.id === FAKE_DOOR_FEATURES.LOGGING,
	);
	if (loggingFeature) {
		loggingFeature.actionBoxTitle += '.cloud';
		loggingFeature.linkURL += '&edition=cloud';
		loggingFeature.infoText = '' as BaseTextKey;
	}

	return fakeDoorFeatures;
}

export const hooksAddFakeDoorFeatures = () => {
	const store = useUIStore();

	store.fakeDoorFeatures = compileFakeDoorFeatures();
};
