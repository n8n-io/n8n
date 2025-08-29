"use strict";

// Emulated LicenseManager that bypasses all validation
const AUTORENEWAL_INTERVAL = 15 * 60 * 1000;

class LicenseManager {
    constructor(config) {
        this.config = config;
        this.expirySoonCallbackFired = false;
        this.isShuttingDown = false;
        this.initializationPromise = null;
        this.deviceFingerprint = null;
        this.currentFeatures = {};
        
        // Mock license certificate
        this.licenseCert = {
            consumerId: "emulated-consumer",
            version: 1,
            tenantId: config.tenantId || 1,
            renewalToken: "emulated-token",
            deviceLock: false,
            deviceFingerprint: "",
            createdAt: new Date("2025-01-01"),
            issuedAt: new Date("2025-01-01"),
            expiresAt: new Date("2030-01-01"),
            terminatesAt: new Date("2030-01-01"),
            planName: "Enterprise",
            entitlements: [{
                id: "emulated-entitlement",
                productId: "emulated-product",
                productMetadata: { terms: { isMainPlan: true }, planName: "Enterprise" },
                features: {
                    "feat:sharing": true,
                    "feat:ldap": true,
                    "feat:saml": true,
                    "feat:variables": true,
                    "feat:external-secrets": true,
                    "feat:workflow-history": true,
                    "feat:binary-data-s3": true,
                    "feat:multiple-main-instances": true,
                    "feat:source-control": true,
                    "feat:advanced-permissions": true,
                    "feat:debug-in-editor": true,
                    "feat:showNonProdBanner": false,
                    "quota:users": -1,
                    "quota:activeWorkflowTriggers": -1,
                    "quota:variables": -1
                },
                featureOverrides: {},
                validFrom: new Date("2025-01-01"),
                validTo: new Date("2030-01-01"),
                isFloatable: false
            }],
            detachedEntitlementsCount: 0,
            managementJwt: "",
            isEphemeral: true
        };
        
        this.updateCurrentFeatures();
        
        // Setup logger
        if (config.logger) {
            this.logger = config.logger;
        } else {
            this.logger = {
                error: () => console.log("ERROR:", ...arguments),
                warn: () => console.log("WARN:", ...arguments),
                info: () => console.log("INFO:", ...arguments),
                debug: () => console.log("DEBUG:", ...arguments)
            };
        }
    }

    get isInitialized() {
        return !!this.initializationPromise;
    }

    log(message, level) {
        this.logger[level](\`[license SDK] \${message}\`);
    }

    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this._doInitialization();
        return await this.initializationPromise;
    }

    async _doInitialization() {
        this.deviceFingerprint = await this.computeDeviceFingerprint();
        this.log(\`initializing for deviceFingerprint \${this.deviceFingerprint}\`, "debug");
        this.log("Emulated license manager initialized with Enterprise features", "info");
    }

    async computeDeviceFingerprint() {
        if (this.config.deviceFingerprint && typeof this.config.deviceFingerprint === "function") {
            return await this.config.deviceFingerprint();
        }
        return "emulated-device-fingerprint";
    }

    // All validation methods return true
    isValid(logErrors = true) {
        return true;
    }

    hasFeatureEnabled(feature, validateLicense = true) {
        // Special case: this feature should be FALSE for licensed instances
        if (feature === 'feat:showNonProdBanner') {
            return false;
        }
        // All other enterprise features should be true
        return true;
    }

    hasFeatureDefined(feature, validateLicense = true) {
        return true;
    }

    hasQuotaLeft(feature, used) {
        return true;
    }

    getFeatureValue(feature, validateLicense = true) {
        // Special case: this feature should be FALSE for licensed instances
        if (feature === 'feat:showNonProdBanner') {
            return false;
        }
        // Return unlimited quota for quota features
        if (feature.startsWith("quota:")) {
            return -1;
        }
        // Return true for boolean features
        return true;
    }

    hasCert() {
        return true;
    }

    isTerminated() {
        return false;
    }

    getExpiryDate() {
        return this.licenseCert.expiresAt;
    }

    getTerminationDate() {
        return this.licenseCert.terminatesAt;
    }

    getFeatures() {
        return this.currentFeatures;
    }

    updateCurrentFeatures() {
        this.currentFeatures = {
            "feat:sharing": true,
            "feat:ldap": true,
            "feat:saml": true,
            "feat:variables": true,
            "feat:external-secrets": true,
            "feat:workflow-history": true,
            "feat:binary-data-s3": true,
            "feat:multiple-main-instances": true,
            "feat:source-control": true,
            "feat:advanced-permissions": true,
            "feat:debug-in-editor": true,
            "feat:showNonProdBanner": false,
            "quota:users": -1,
            "quota:activeWorkflowTriggers": -1,
            "quota:variables": -1
        };
    }

    getCurrentEntitlements() {
        return this.licenseCert.entitlements;
    }

    getManagementJwt() {
        return this.licenseCert.managementJwt;
    }

    async getCertStr() {
        return "emulated-cert-string";
    }

    getConsumerId() {
        return this.licenseCert.consumerId;
    }

    isRenewalDue() {
        return false;
    }

    // License management methods (no-ops)
    async activate(activationKey) {
        this.log("license activation bypassed (emulated)", "info");
        return Promise.resolve();
    }

    async renew() {
        this.log("license renewal bypassed (emulated)", "info");
        return Promise.resolve();
    }

    async clear() {
        this.log("license clear bypassed (emulated)", "info");
        return Promise.resolve();
    }

    async shutdown() {
        this.isShuttingDown = true;
        this.log("license manager shutdown (emulated)", "info");
        return Promise.resolve();
    }

    // Timer management (no-ops)
    setupSingleTimer(callback, delay) {
        return setTimeout(callback, delay);
    }

    clearSingleTimer(timer) {
        if (timer) clearTimeout(timer);
    }

    setupRepeatingTimer(callback, interval) {
        return setInterval(callback, interval);
    }

    clearRepeatingTimer(timer) {
        if (timer) clearInterval(timer);
    }

    // Utility methods
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return \`\${hours}h \${minutes}m \${secs}s\`;
    }

    toString() {
        return \`## EMULATED LICENSE MANAGER ##
License: Enterprise (Emulated)
Valid: true
Features: All Enterprise features enabled
Expiry: \${this.licenseCert.expiresAt}
Status: Active (Bypassed)\`;
    }

    // Additional methods that might be called
    async reload() {
        await this.initialize();
    }

    async reset() {
        // No-op for emulated manager
    }

    triggerOnFeatureChangeCallback() {
        if (this.config.onFeatureChange) {
            this.config.onFeatureChange(this.currentFeatures);
        }
    }

    enableAutoRenewals() {
        this.log("Auto-renewals enabled (emulated)", "info");
    }

    disableAutoRenewals() {
        this.log("Auto-renewals disabled (emulated)", "info");
    }
}

// Export in the expected format
module.exports = {
    AUTORENEWAL_INTERVAL,
    LicenseManager
};
