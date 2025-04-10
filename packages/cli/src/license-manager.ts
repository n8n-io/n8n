import type {
	TLicenseManagerConfig,
	TLicenseCertObj,
	TEntitlement,
	TFeatures,
	TLicenseBlock,
	TMetadata,
} from '@n8n_io/license-sdk';
import { X509Certificate } from 'node:crypto';
import { v4 } from 'uuid';

import { LICENSE_FEATURES, LICENSE_QUOTAS } from '@/constants';

const MANUALLY_DISABLED_FEATURES: string[] = [
	LICENSE_FEATURES.API_DISABLED,
	LICENSE_FEATURES.SHOW_NON_PROD_BANNER,
];

const UNLIMITED_LICENSE_QUOTA = -1;

export class LicenseManager {
	private initialized = false;

	private readonly licenseCert: TLicenseCertObj;

	private readonly currentFeatures: TFeatures;

	constructor(public config: TLicenseManagerConfig) {
		// Create features with all LICENSE_FEATURES enabled (except manually disabled ones)
		this.currentFeatures = Object.values(LICENSE_FEATURES).reduce(
			(features: TFeatures, feature: string) => {
				features[feature] = !MANUALLY_DISABLED_FEATURES.includes(feature);
				return features;
			},
			{} as TFeatures,
		);

		// Add unlimited quotas for all LICENSE_QUOTAS
		Object.values(LICENSE_QUOTAS).forEach((quota) => {
			this.currentFeatures[quota] = UNLIMITED_LICENSE_QUOTA;
		});

		this.currentFeatures.planName = 'n8n+';

		const farFuture = new Date();
		farFuture.setFullYear(farFuture.getFullYear() + 100);

		// Generate valid looking fingerprint, consumer ID and tokens
		const deviceFingerprint = this.generateUUID();
		const consumerId = this.generateUUID();
		const renewalToken = this.generateSecureToken();
		const managementJwt = this.generateJWT();

		this.licenseCert = {
			consumerId,
			version: 1,
			tenantId: this.config.tenantId,
			renewalToken,
			deviceLock: false,
			deviceFingerprint,
			createdAt: new Date(),
			issuedAt: new Date(),
			expiresAt: farFuture,
			terminatesAt: farFuture,
			entitlements: [this.createEntitlement()],
			detachedEntitlementsCount: 0,
			managementJwt,
			isEphemeral: false,
		};
	}

	private generateUUID(): string {
		return v4();
	}

	private generateSecureToken(): string {
		// Generate a secure-looking token
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';
		for (let i = 0; i < 64; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return `rt_${result}`;
	}

	private generateJWT(): string {
		// Generate a fake but valid-looking JWT token
		const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
			.toString('base64')
			.replace(/=/g, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_');

		const payload = Buffer.from(
			JSON.stringify({
				sub: this.generateUUID(),
				name: 'n8n Plus License',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 86400 * 365,
			}),
		)
			.toString('base64')
			.replace(/=/g, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_');

		// Generate random signature
		const signatureChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
		let signature = '';
		for (let i = 0; i < 43; i++) {
			signature += signatureChars.charAt(Math.floor(Math.random() * signatureChars.length));
		}

		return `${header}.${payload}.${signature}`;
	}

	get isInitialized(): boolean {
		return this.initialized;
	}

	private createEntitlement(): TEntitlement {
		const now = new Date();
		const farFuture = new Date();
		farFuture.setFullYear(farFuture.getFullYear() + 100);

		return {
			id: 'n8n-plus-' + this.generateUUID(),
			productId: 'n8n-plus-' + this.generateUUID(),
			productMetadata: {
				terms: { isMainPlan: true },
				metadataKey1: 'n8n-plus',
			} as TMetadata,
			features: this.currentFeatures,
			featureOverrides: {},
			validFrom: now,
			validTo: farFuture,
			isFloatable: false,
		};
	}

	async initialize(): Promise<void> {
		this.initialized = true;
		if (this.config.onFeatureChange) {
			await this.config.onFeatureChange(this.currentFeatures);
		}
	}

	async _doInitialization(): Promise<void> {
		return await this.initialize();
	}

	clearSingleTimer(): void {
		// Do nothing
	}

	setupRepeatingTimer(): NodeJS.Timeout {
		return setTimeout(() => {}, 100000);
	}

	clearRepeatingTimer(): void {
		// Do nothing
	}

	async reload(): Promise<void> {
		if (this.config.onFeatureChange) {
			await this.config.onFeatureChange(this.currentFeatures);
		}
	}

	async reset(): Promise<void> {
		// Do nothing
	}

	async computeDeviceFingerprint(): Promise<string> {
		return this.licenseCert.deviceFingerprint;
	}

	async activate(reservationId: string): Promise<void> {
		// Do nothing
	}

	async renew(): Promise<void> {
		// Do nothing
	}

	async _renew(options?: { detachFloatingEntitlements?: boolean; cause?: string }): Promise<void> {
		// Do nothing
	}

	hasCert(): boolean {
		return true;
	}

	isTerminated(): boolean {
		return false;
	}

	getExpiryDate(): Date {
		const farFuture = new Date();
		farFuture.setFullYear(farFuture.getFullYear() + 100);
		return farFuture;
	}

	getTerminationDate(): Date {
		const farFuture = new Date();
		farFuture.setFullYear(farFuture.getFullYear() + 100);
		return farFuture;
	}

	isValid(useLogger?: boolean): boolean {
		return true;
	}

	hasFeatureEnabled(feature: string, requireValidCert?: boolean): boolean {
		return this.currentFeatures[feature] === true;
	}

	hasFeatureDefined(feature: string, requireValidCert?: boolean): boolean {
		return feature in this.currentFeatures;
	}

	hasQuotaLeft(quotaFeatureName: string, currentConsumption: number): boolean {
		return true;
	}

	getFeatureValue(
		feature: string,
		requireValidCert?: boolean,
	): boolean | number | string | undefined {
		return this.currentFeatures[feature];
	}

	getFeatures(): TFeatures {
		return this.currentFeatures;
	}

	getCurrentEntitlements(): TEntitlement[] {
		return [this.createEntitlement()];
	}

	getManagementJwt(): string {
		return this.licenseCert.managementJwt;
	}

	async getCertStr(): Promise<TLicenseBlock> {
		return 'license-block';
	}

	getConsumerId(): string {
		return this.licenseCert.consumerId;
	}

	isRenewalDue(): boolean {
		return false;
	}

	toString(): string {
		return `${this.currentFeatures.planName} License`;
	}

	getIssuerCert(): X509Certificate {
		return new X509Certificate('');
	}

	async clear(): Promise<void> {
		// Do nothing
	}

	async shutdown(): Promise<void> {
		// Do nothing
	}

	enableAutoRenewals(): void {
		// Do nothing
	}

	disableAutoRenewals(): void {
		// Do nothing
	}
}
