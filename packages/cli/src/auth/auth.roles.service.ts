import { Logger } from '@n8n/backend-common';
import { Scope, ScopeRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ALL_SCOPES, scopeInformation } from '@n8n/permissions';

@Service()
export class AuthRolesService {
	constructor(
		private readonly logger: Logger,
		private readonly globalScopeRepository: ScopeRepository,
	) {}

	private async syncScopes() {
		const availableScopes = await this.globalScopeRepository.find({
			select: {
				slug: true,
				displayName: true,
				description: true,
			},
		});

		const scopesToUpdate = ALL_SCOPES.map((slug) => {
			const info = scopeInformation[slug] ?? {
				displayName: slug,
				description: null,
			};
			return [slug, info.displayName, info.description ?? null] as const;
		})
			.filter(([slug, displayName, description]) => {
				const existingScope = availableScopes.find((scope) => scope.slug === slug);
				if (existingScope) {
					// Check if the existing scope needs to be updated
					return (
						existingScope.displayName !== displayName || existingScope.description !== description
					);
				}
				// If the scope does not exist, it needs to be created, so we return true
				return true;
			})
			.map(([slug, displayName, sourceDescription]) => {
				const existingScope = availableScopes.find((scope) => scope.slug === slug);
				if (existingScope) {
					existingScope.displayName = displayName;
					existingScope.description = sourceDescription ?? null;
					return existingScope;
				}
				// If the scope does not exist, return a new object
				const newScope = new Scope();
				newScope.slug = slug;
				newScope.displayName = displayName;
				newScope.description = sourceDescription ?? null;
				return newScope;
			});

		if (scopesToUpdate.length > 0) {
			this.logger.info(`Updating ${scopesToUpdate.length} scopes...`);
			await this.globalScopeRepository.save(scopesToUpdate);
			this.logger.info('Scopes updated successfully.');
		} else {
			this.logger.info('No scopes to update.');
		}
	}

	async init() {
		this.logger.info('Initializing AuthRolesService...');
		await this.syncScopes();
		this.logger.info('AuthRolesService initialized successfully.');
	}
}
