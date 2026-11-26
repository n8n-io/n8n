import type {
	CreateRuntimeCredentialRuleDto,
	RuntimeCredentialRule,
	UpdateRuntimeCredentialRuleDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { RuntimeCredentialRuleRepository, isUniqueConstraintError } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';

import { CredentialTypes } from '@/credential-types';

import { RuntimeCredentialStubSeeder } from './runtime-credential-stub.seeder';
import {
	type CredentialRule,
	RuntimeCredentialsService,
	runtimeStubId,
} from './runtime-credentials.service';

/** Admin operations on run-time input rules. Environment rules are read-only. */
@Service()
export class RuntimeCredentialRulesService {
	constructor(
		private readonly logger: Logger,
		private readonly rulesService: RuntimeCredentialsService,
		private readonly repository: RuntimeCredentialRuleRepository,
		private readonly credentialTypes: CredentialTypes,
		private readonly seeder: RuntimeCredentialStubSeeder,
	) {}

	list(): RuntimeCredentialRule[] {
		return this.rulesService
			.getCredentialRules()
			.map(([alias, rule]) => this.toResponse(alias, rule));
	}

	async create(dto: CreateRuntimeCredentialRuleDto): Promise<RuntimeCredentialRule> {
		if (!this.credentialTypes.recognizes(dto.credentialType)) {
			throw new BadRequestError(`Unknown credential type "${dto.credentialType}"`);
		}
		if (this.rulesService.isEnvironmentRule(dto.alias)) throw this.aliasExists(dto.alias);

		try {
			await this.repository.insertRule(
				{
					alias: dto.alias,
					nodeType: dto.nodeType,
					path: dto.path,
					credentialType: dto.credentialType,
					transform: dto.transform ?? null,
					allowedDomains: dto.allowedDomains ?? null,
				},
				{},
			);
		} catch (error) {
			if (isUniqueConstraintError(error)) throw this.aliasExists(dto.alias);
			throw error;
		}

		await this.afterChange();
		const rule = this.requireRule(dto.alias);
		await this.seeder.seedRule(dto.alias, rule);
		return this.toResponse(dto.alias, rule);
	}

	async update(alias: string, dto: UpdateRuntimeCredentialRuleDto): Promise<RuntimeCredentialRule> {
		await this.requireDatabaseRule(alias);

		await this.repository.updateByAlias(
			alias,
			{
				...(dto.nodeType !== undefined && { nodeType: dto.nodeType }),
				...(dto.path !== undefined && { path: dto.path }),
				...(dto.transform !== undefined && { transform: dto.transform }),
				...(dto.allowedDomains !== undefined && { allowedDomains: dto.allowedDomains }),
			},
			{},
		);

		await this.afterChange();
		return this.toResponse(alias, this.requireRule(alias));
	}

	/** The stub credential stays, because workflows reference it. */
	async delete(alias: string): Promise<void> {
		await this.requireDatabaseRule(alias);
		await this.repository.deleteByAlias(alias, {});
		await this.afterChange();
	}

	private async requireDatabaseRule(alias: string) {
		if (this.rulesService.isEnvironmentRule(alias)) {
			throw new ForbiddenError(
				`The rule "${alias}" comes from the environment and cannot be changed here`,
			);
		}
		const row = await this.repository.findByAlias(alias, {});
		if (!row) throw new NotFoundError(`No run-time input rule has the alias "${alias}"`);
		return row;
	}

	/** Refreshes this main, then tells the other processes to refresh. */
	private async afterChange() {
		await this.rulesService.loadDatabaseRules();
		try {
			const { Publisher } = await import('@n8n/backend-services');
			await Container.get(Publisher).publishCommand({ command: 'reload-runtime-credential-rules' });
		} catch (error) {
			// The change is stored. Other mains read it at the next start or the next change.
			this.logger.warn('Failed to tell other processes about a run-time input rule change', {
				error,
			});
		}
	}

	private requireRule(alias: string): CredentialRule {
		const entry = this.rulesService.getCredentialRules().find(([name]) => name === alias);
		if (!entry) throw new NotFoundError(`No run-time input rule has the alias "${alias}"`);
		return entry[1];
	}

	private aliasExists(alias: string) {
		return new ConflictError(`A run-time input rule with the alias "${alias}" already exists`);
	}

	private toResponse(alias: string, rule: CredentialRule): RuntimeCredentialRule {
		return {
			alias,
			nodeType: rule.nodeType,
			path: rule.path,
			credentialType: rule.credentialType,
			...(rule.transform !== undefined && {
				transform: rule.transform as RuntimeCredentialRule['transform'],
			}),
			...(rule.allowedDomains !== undefined && { allowedDomains: rule.allowedDomains }),
			source: this.rulesService.isEnvironmentRule(alias) ? 'environment' : 'database',
			stubCredentialId: runtimeStubId(alias),
		};
	}
}
