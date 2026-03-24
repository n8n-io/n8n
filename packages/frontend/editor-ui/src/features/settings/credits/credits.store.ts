import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useCreditsStore = defineStore('credits', () => {
	const balance = ref(5.0);
	const planName = ref('Starter Plan');
	const planAmount = ref(50);
	const nextTopUpDate = ref('31 March');

	const autoRechargeEnabled = ref(false);
	const autoRechargeThreshold = ref(1.0);
	const autoRechargeTopUpTo = ref(50.0);
	const paymentMethod = ref('');

	const limitsEnabled = ref(false);
	const instanceLimit = ref(100);
	const perUserLimit = ref(25);

	const formattedBalance = computed(() => `$${balance.value.toFixed(2)}`);

	function topUp(amount: number) {
		balance.value += amount;
	}

	/** Align shell balance with AI Gateway when the server reports credits (settings / prototype usage). */
	function setBalance(amount: number) {
		balance.value = amount;
	}

	function setAutoRecharge(enabled: boolean) {
		autoRechargeEnabled.value = enabled;
	}

	function updateAutoRechargeSettings(settings: {
		threshold?: number;
		topUpTo?: number;
		paymentMethod?: string;
	}) {
		if (settings.threshold !== undefined) autoRechargeThreshold.value = settings.threshold;
		if (settings.topUpTo !== undefined) autoRechargeTopUpTo.value = settings.topUpTo;
		if (settings.paymentMethod !== undefined) paymentMethod.value = settings.paymentMethod;
	}

	function setLimitsEnabled(enabled: boolean) {
		limitsEnabled.value = enabled;
	}

	function updateLimits(settings: { instanceLimit?: number; perUserLimit?: number }) {
		if (settings.instanceLimit !== undefined) instanceLimit.value = settings.instanceLimit;
		if (settings.perUserLimit !== undefined) perUserLimit.value = settings.perUserLimit;
	}

	return {
		balance,
		planName,
		planAmount,
		nextTopUpDate,
		autoRechargeEnabled,
		autoRechargeThreshold,
		autoRechargeTopUpTo,
		paymentMethod,
		limitsEnabled,
		instanceLimit,
		perUserLimit,
		formattedBalance,
		topUp,
		setBalance,
		setAutoRecharge,
		updateAutoRechargeSettings,
		setLimitsEnabled,
		updateLimits,
	};
});
