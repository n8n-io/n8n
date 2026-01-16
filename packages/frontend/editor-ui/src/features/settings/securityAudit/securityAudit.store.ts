import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	SecurityAuditResponse,
	AuditReport,
	RiskCategory,
	RunAuditOptions,
} from './securityAudit.api';
import { runSecurityAudit } from './securityAudit.api';

export const useSecurityAuditStore = defineStore('securityAudit', () => {
	const rootStore = useRootStore();

	const auditResult = ref<SecurityAuditResponse | null>(null);
	const isLoading = ref(false);
	const lastRunAt = ref<Date | null>(null);
	const error = ref<Error | null>(null);

	const hasResults = computed(() => {
		if (!auditResult.value) return false;
		return !Array.isArray(auditResult.value) && Object.keys(auditResult.value).length > 0;
	});

	const isEmptyResult = computed(() => {
		if (!auditResult.value) return false;
		return Array.isArray(auditResult.value) && auditResult.value.length === 0;
	});

	const reports = computed<AuditReport[]>(() => {
		if (!auditResult.value || Array.isArray(auditResult.value)) return [];
		return Object.values(auditResult.value);
	});

	const totalIssueCount = computed(() => {
		return reports.value.reduce((total, report) => {
			return total + report.sections.length;
		}, 0);
	});

	const issueCountByCategory = computed<Record<RiskCategory, number>>(() => {
		const counts: Record<RiskCategory, number> = {
			credentials: 0,
			database: 0,
			nodes: 0,
			instance: 0,
			filesystem: 0,
		};
		for (const report of reports.value) {
			counts[report.risk] = report.sections.length;
		}
		return counts;
	});

	const getReportByCategory = (category: RiskCategory): AuditReport | undefined => {
		return reports.value.find((report) => report.risk === category);
	};

	const runAudit = async (options?: RunAuditOptions) => {
		isLoading.value = true;
		error.value = null;
		try {
			auditResult.value = await runSecurityAudit(rootStore.restApiContext, options);
			lastRunAt.value = new Date();
		} catch (e) {
			error.value = e instanceof Error ? e : new Error(String(e));
			throw e;
		} finally {
			isLoading.value = false;
		}
	};

	const reset = () => {
		auditResult.value = null;
		lastRunAt.value = null;
		error.value = null;
	};

	return {
		auditResult,
		isLoading,
		lastRunAt,
		error,
		hasResults,
		isEmptyResult,
		reports,
		totalIssueCount,
		issueCountByCategory,
		getReportByCategory,
		runAudit,
		reset,
	};
});
