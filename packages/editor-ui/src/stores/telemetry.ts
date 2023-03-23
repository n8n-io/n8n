import type { Telemetry } from '@/plugins/telemetry';
import { ITelemetryTrackProperties } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';

export const useTelemetryStore = defineStore('telemetry', () => {
	const telemetry: Ref<Telemetry | undefined> = ref();

	const init = (tel: Telemetry) => {
		telemetry.value = tel;
	};

	const track = (event: string, properties?: ITelemetryTrackProperties) => {
		telemetry.value?.track(event, properties);
	};

	return {
		init,
		track,
	};
});
