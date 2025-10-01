import { Service } from '@n8n/di';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';

@Service()
export class ReadOnlyInstanceChecker {
	constructor(private readonly sourceControlPreferences: SourceControlPreferencesService) {}

	isEnvironmentReadOnly(): boolean {
		return this.sourceControlPreferences.isBranchReadOnly();
	}
}
