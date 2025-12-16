/**
 * 企业版许可证模拟器 - 仅用于开发和测试环境
 *
 * 此文件提供了一个简单的方法来模拟企业版许可证，
 * 使所有企业功能在开发和测试环境中可用。
 *
 * 警告：请勿在生产环境中使用此代码！
 */

import type { BooleanLicenseFeature } from '@n8n/constants';
import { LICENSE_FEATURES, LICENSE_QUOTAS, UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';

import type { License } from '@/license';

export class EnterpriseLicenseMocker {
	private static instance: EnterpriseLicenseMocker;
	private originalMethods: Map<string, unknown> = new Map();

	static getInstance(): EnterpriseLicenseMocker {
		if (!EnterpriseLicenseMocker.instance) {
			EnterpriseLicenseMocker.instance = new EnterpriseLicenseMocker();
		}
		return EnterpriseLicenseMocker.instance;
	}

	/**
	 * 启用所有企业版功能
	 */
	enableAllEnterpriseFeatures(license: License): void {
		// 保存原始方法以便恢复
		this.originalMethods.set('isLicensed', license.isLicensed.bind(license));
		this.originalMethods.set('getValue', license.getValue.bind(license));

		// 模拟许可证检查 - 所有功能都返回true，除了SHOW_NON_PROD_BANNER
		license.isLicensed = (feature: BooleanLicenseFeature): boolean => {
			// 特殊处理：SHOW_NON_PROD_BANNER应该返回false以隐藏横幅
			if (
				feature === 'feat:showNonProdBanner' ||
				feature === 'feat:apiDisabled' ||
				feature === 'feat:aiAssistant' ||
				feature === 'feat:askAi'
			) {
				// console.log(`[ENTERPRISE MOCK] Feature ${feature} disabled (hiding non-prod banner)`);
				return false;
			}
			// console.log(`[ENTERPRISE MOCK] Feature ${feature} enabled`);
			return true;
		};

		// 模拟配额值 - 返回无限制或很大的数值
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
		(license as any).getValue = (feature: string) => {
			if (feature === 'planName') {
				return 'Enterprise (Mocked)';
			}

			// 对于配额类型，返回无限制
			if (Object.values(LICENSE_QUOTAS).some((quota) => quota === feature)) {
				console.log(`[ENTERPRISE MOCK] Quota ${feature} set to unlimited`);
				return UNLIMITED_LICENSE_QUOTA;
			}

			// 对于布尔功能，返回true；
			if (Object.values(LICENSE_FEATURES).some((licenseFeature) => licenseFeature === feature)) {
				console.log(`[ENTERPRISE MOCK] Feature ${feature} enabled`);
				return true;
			}

			const originalGetValue = this.originalMethods.get('getValue');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
			return (originalGetValue as any)?.(feature) ?? false;
		};

		// 注意：许多方法已被弃用，建议使用 LicenseState 替代
		// 这里只模拟一些仍在使用的核心方法

		// 模拟配额方法（已弃用但仍可能被使用）
		if (license.getUsersLimit) {
			license.getUsersLimit = () => UNLIMITED_LICENSE_QUOTA;
		}
		if (license.getTriggerLimit) {
			license.getTriggerLimit = () => UNLIMITED_LICENSE_QUOTA;
		}
		if (license.getVariablesLimit) {
			license.getVariablesLimit = () => UNLIMITED_LICENSE_QUOTA;
		}
		if (license.getAiCredits) {
			license.getAiCredits = () => 999999;
		}
		if (license.getWorkflowHistoryPruneLimit) {
			license.getWorkflowHistoryPruneLimit = () => UNLIMITED_LICENSE_QUOTA;
		}
		if (license.getTeamProjectLimit) {
			license.getTeamProjectLimit = () => UNLIMITED_LICENSE_QUOTA;
		}
		if (license.isWithinUsersLimit) {
			license.isWithinUsersLimit = () => true;
		}

		// 模拟许可证信息
		license.getPlanName = () => 'Enterprise (Mocked)';
		license.getConsumerId = () => 'enterprise-mock-consumer';
		license.getManagementJwt = () => 'mock-jwt-token';

		console.log('[ENTERPRISE MOCK] All enterprise features enabled for testing');
	}

	/**
	 * 恢复原始许可证方法
	 */
	restore(license: License): void {
		if (this.originalMethods.has('isLicensed')) {
			const originalIsLicensed = this.originalMethods.get(
				'isLicensed',
			) as typeof license.isLicensed;
			license.isLicensed = originalIsLicensed;
		}
		if (this.originalMethods.has('getValue')) {
			const originalGetValue = this.originalMethods.get('getValue') as typeof license.getValue;
			license.getValue = originalGetValue;
		}
		this.originalMethods.clear();
		console.log('[ENTERPRISE MOCK] Original license methods restored');
	}

}

/**
 * 全局函数：启用企业版模拟
 * 在应用启动时调用此函数来启用所有企业功能
 */
export function enableEnterpriseMock(license: License): void {
	EnterpriseLicenseMocker.getInstance().enableAllEnterpriseFeatures(license);
}

/**
 * 全局函数：禁用企业版模拟
 */
export function disableEnterpriseMock(license: License): void {
	EnterpriseLicenseMocker.getInstance().restore(license);
}
