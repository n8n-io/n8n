import { ControllerRegistry } from '@/controller.registry';
import { LicenseState, Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

@Service()
export class OidcInitializationService {
	private loadOidcModuleOnce: Promise<void> | null = null;
	constructor(
		private readonly licenseState: LicenseState,
		private readonly logger: Logger,
		private readonly controllerRegistry: ControllerRegistry,
	) {}

	private loadOidcModule() {
		if (this.loadOidcModuleOnce) {
			return this.loadOidcModuleOnce;
		}

		this.loadOidcModuleOnce = (async () => {
			try {
				const { OidcService } = await import('@/sso.ee/oidc/oidc.service.ee');
				await Container.get(OidcService).init();
				await import('@/sso.ee/oidc/routes/oidc.controller.ee');
				await this.controllerRegistry.activate();
			} catch (error) {
				this.logger.warn(`OIDC initialization failed: ${(error as Error).message}`);
			}
		})();

		return this.loadOidcModuleOnce;
	}
	/**
	 * Initializes the OIDC module if the OIDC feature is licensed.
	 * Sets up a listener to re-initialize if the license changes.
	 */
	async init() {
		if (this.licenseState.isOidcLicensed()) {
			await this.loadOidcModule();
		} else {
			this.logger.debug('OIDC is not licensed, skipping initialization');
		}
		this.licenseState.addOnChangeCallback(() => {
			if (this.licenseState.isOidcLicensed()) {
				this.logger.debug('OIDC license changed, re-initializing OIDC module');
				this.loadOidcModule().catch((error) => {
					this.logger.error(`Error during OIDC re-initialization: ${(error as Error).message}`);
				});
			}
		});
	}
}
