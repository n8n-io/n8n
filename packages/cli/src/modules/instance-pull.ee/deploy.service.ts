import { Service } from '@n8n/di';

import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import type {
	BlockingIssue,
	ImportPackageRequest,
} from '@/modules/n8n-packages/n8n-packages.types';

import { BindingSessionService } from './binding-session.service';

export interface DeployValidation {
	issues: BlockingIssue[];
	bindingUrl: string;
}

/**
 * Instance-pull glue for the CI deploy flow. Wraps the pure
 * {@link N8nPackagesService.validatePackage} dry-run with the per-PR binding
 * session + the credential-binding link the GitHub Action surfaces. Lives in the
 * instance-pull feature module so the n8n-packages core stays free of demo concerns.
 */
@Service()
export class DeployService {
	constructor(
		private readonly packagesService: N8nPackagesService,
		private readonly bindingSessions: BindingSessionService,
	) {}

	async validate(request: ImportPackageRequest, pr: string): Promise<DeployValidation> {
		// Merge the operator's bind-existing resolutions so a resolved credential makes the
		// dry-run pass (symmetric with the import path). Create-new needs no binding: the
		// credential exists at the source id, which id-only matching resolves by default.
		const credentialBindings = new Map(request.credentialBindings);
		for (const [sourceId, targetId] of this.bindingSessions.bindingsFor(pr)) {
			credentialBindings.set(sourceId, targetId);
		}
		const issues = await this.packagesService.validatePackage({ ...request, credentialBindings });
		this.bindingSessions.record(pr, issues);
		return { issues, bindingUrl: this.bindingSessions.urlFor(pr) };
	}
}
