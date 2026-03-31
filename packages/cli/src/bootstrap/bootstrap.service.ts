import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { ApiKeyBootstrapStep } from './steps/api-key.bootstrap-step';
import { CommunityPackagesBootstrapStep } from './steps/community-packages.bootstrap-step';
import { OidcBootstrapStep } from './steps/oidc.bootstrap-step';
import { OwnerBootstrapStep } from './steps/owner.bootstrap-step';
import { SamlBootstrapStep } from './steps/saml.bootstrap-step';

type StepResult = 'created' | 'skipped';

@Service()
export class BootstrapService {
	constructor(
		private logger: Logger,
		private readonly ownerStep: OwnerBootstrapStep,
		private readonly oidcStep: OidcBootstrapStep,
		private readonly samlStep: SamlBootstrapStep,
		private readonly apiKeyStep: ApiKeyBootstrapStep,
		private readonly communityPackagesStep: CommunityPackagesBootstrapStep,
	) {
		this.logger = this.logger.scoped('bootstrap');
	}

	async init(): Promise<void> {
		await this.run('owner', async () => await this.ownerStep.run());
		await this.run('sso-oidc', async () => await this.oidcStep.run());
		await this.run('sso-saml', async () => await this.samlStep.run());
		await this.run('api-key', async () => await this.apiKeyStep.run());
		await this.run('community-packages', async () => await this.communityPackagesStep.run());
	}

	private async run(name: string, fn: () => Promise<StepResult>): Promise<void> {
		const result = await fn();
		this.logger.debug(`Bootstrap step "${name}": ${result}`);
	}
}
