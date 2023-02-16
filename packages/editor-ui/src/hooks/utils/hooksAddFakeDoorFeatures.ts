import { useUIStore } from '@/stores/ui';

export function compileFakeDoorFeatures() {
	const store = useUIStore();
	const fakeDoorFeatures = store.fakeDoorFeatures.map((feature) => Object.assign({}, feature));
	const environmentsFeature = fakeDoorFeatures.find((feature) => feature.id === 'environments');
	const loggingFeature = fakeDoorFeatures.find((feature) => feature.id === 'logging');

	if (environmentsFeature) {
		environmentsFeature.actionBoxTitle += '.cloud';
		environmentsFeature.linkURL += '&edition=cloud';
	}

	if (loggingFeature) {
		loggingFeature.actionBoxTitle += '.cloud';
		loggingFeature.linkURL += '&edition=cloud';
		loggingFeature.infoText = '';
	}

	return fakeDoorFeatures;
}

export const hooksAddFakeDoorFeatures = () => {
	const store = useUIStore();

	store.fakeDoorFeatures = compileFakeDoorFeatures();
};
