import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useCloudPlanStore } from '@/stores';
import { CLOUD_TRIAL_CHECK_INTERVAL } from '@/constants';

export const cloudPlanData = defineComponent({
	computed: {
		...mapStores(useCloudPlanStore),
	},
	methods: {
		async checkForCloudPlanData(): Promise<void> {
			try {
				await this.cloudPlanStore.getOwnerCurrentPlan();
				if (!this.cloudPlanStore.userIsTrialing) return;
				await this.cloudPlanStore.getInstanceCurrentUsage();
				this.startPollingInstanceUsageData();
			} catch {}
		},
		startPollingInstanceUsageData() {
			const interval = setInterval(async () => {
				try {
					await this.cloudPlanStore.getInstanceCurrentUsage();
					if (this.cloudPlanStore.trialExpired || this.cloudPlanStore.allExecutionsUsed) {
						clearTimeout(interval);
						return;
					}
				} catch {}
			}, CLOUD_TRIAL_CHECK_INTERVAL);
		},
	},
});
