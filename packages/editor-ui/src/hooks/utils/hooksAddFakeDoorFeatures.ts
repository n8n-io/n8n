import { useWebhooksStore } from '@/stores/webhooks';

export const compileFakeDoorFeatures = (store: ReturnType<typeof useWebhooksStore>) => {
	const fakeDoorFeatures = store.getFakeDoorFeatures.map((feature) => Object.assign({}, feature));
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
};

export const hooksAddFakeDoorFeatures = () => {
	const store = useWebhooksStore();

	store.setFakeDoorFeatures(compileFakeDoorFeatures(store));
};
