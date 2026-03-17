import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const credentialDependencyTable = 'credential_dependency';
const externalSecretProviderDependencyType = 'externalSecretProvider';
const variableDependencyType = 'variable';
const providerKeyPattern = '[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*';
const variableKeyPattern = '[A-Za-z0-9_]+';

type CredentialRow = {
	id: string;
	data: string;
	ownerProjectId: string | null;
};

export class CreateCredentialDependencyTable1773000000000 implements ReversibleMigration {
	private readonly cipher = Container.get(Cipher);

	async up({
		schemaBuilder: { createTable, column, createIndex },
		escape,
		runQuery,
		runInBatches,
		logger,
		migrationName,
	}: MigrationContext) {
		await createTable(credentialDependencyTable)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('credentialId').varchar(36).notNull,
				column('dependencyType').varchar(64).notNull,
				column('dependencyId').varchar(255).notNull,
			)
			.withForeignKey('credentialId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['credentialId'])
			.withIndexOn(['dependencyType', 'dependencyId']).withCreatedAt;

		await createIndex(
			credentialDependencyTable,
			['credentialId', 'dependencyType', 'dependencyId'],
			true,
		);

		const credentialsTable = escape.tableName('credentials_entity');
		const sharedCredentialsTable = escape.tableName('shared_credentials');
		const credentialsIdColumn = escape.columnName('credentialsId');
		const projectIdColumn = escape.columnName('projectId');
		const roleColumn = escape.columnName('role');
		const query = `SELECT c.id AS id, c.data AS data, sc.${projectIdColumn} AS ownerProjectId FROM ${credentialsTable} c LEFT JOIN ${sharedCredentialsTable} sc ON sc.${credentialsIdColumn} = c.id AND sc.${roleColumn} = 'credential:owner' ORDER BY c.id`;
		const providerIdByKey = await this.loadProviderIdByKey(runQuery, escape);
		const variableIdsByProjectAndKey = await this.loadVariableIdsByProjectAndKey(runQuery, escape);
		const globalVariableIdsByKey = await this.loadGlobalVariableIdsByKey(runQuery, escape);

		let processedCount = 0;
		let insertedCount = 0;

		await runInBatches<CredentialRow>(query, async (rows) => {
			if (rows.length === 0) return;

			const batchDependencies = rows.flatMap((row) => {
				const providerKeys = this.extractProviderKeysFromCredentialData(row.data);
				const providerIds = providerKeys
					.map((providerKey) => providerIdByKey.get(providerKey))
					.filter((providerId): providerId is string => providerId !== undefined);
				const providerDependencies = providerIds.map((providerId) => ({
					credentialId: row.id,
					dependencyType: externalSecretProviderDependencyType,
					dependencyId: providerId,
				}));

				const variableKeys = this.extractVariableKeysFromCredentialData(row.data);
				const variableDependencies = variableKeys.flatMap((variableKey) => {
					const resolvedIds = this.resolveVariableIdsForCredential(
						variableKey,
						row.ownerProjectId,
						variableIdsByProjectAndKey,
						globalVariableIdsByKey,
					);
					return resolvedIds.map((variableId) => ({
						credentialId: row.id,
						dependencyType: variableDependencyType,
						dependencyId: variableId,
					}));
				});

				return [...providerDependencies, ...variableDependencies];
			});

			processedCount += rows.length;

			if (batchDependencies.length === 0) {
				return;
			}

			await this.insertDependencies(batchDependencies, escape, runQuery);
			insertedCount += batchDependencies.length;
		});

		logger.info(
			`[${migrationName}] Backfilled credential dependencies for ${processedCount} credentials. Inserted ${insertedCount} dependencies.`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(credentialDependencyTable);
	}

	private extractProviderKeysFromCredentialData(encryptedCredentialData: string): string[] {
		const decrypted = this.tryDecryptCredentialData(encryptedCredentialData);
		if (decrypted === null) return [];
		return this.extractDependencyKeysFromData(decrypted, '$secrets', (value) =>
			this.extractProviderKeys(value),
		);
	}

	private extractVariableKeysFromCredentialData(encryptedCredentialData: string): string[] {
		const decrypted = this.tryDecryptCredentialData(encryptedCredentialData);
		if (decrypted === null) return [];
		return this.extractDependencyKeysFromData(decrypted, '$vars', (value) =>
			this.extractVariableKeys(value),
		);
	}

	private extractDependencyKeysFromData(
		decryptedCredentialData: unknown,
		token: '$secrets' | '$vars',
		extractKeys: (value: string) => string[],
	): string[] {
		const uniqueKeys = new Set<string>();
		const valuesToScan: unknown[] = [decryptedCredentialData];

		while (valuesToScan.length > 0) {
			const currentValue = valuesToScan.pop();
			if (typeof currentValue === 'string') {
				if (!currentValue.includes(token)) continue;
				for (const dependencyKey of extractKeys(currentValue)) {
					uniqueKeys.add(dependencyKey);
				}
				continue;
			}

			if (Array.isArray(currentValue)) {
				valuesToScan.push(...currentValue);
				continue;
			}

			if (typeof currentValue === 'object' && currentValue !== null) {
				valuesToScan.push(...Object.values(currentValue));
			}
		}

		return [...uniqueKeys];
	}

	private tryDecryptCredentialData(encryptedCredentialData: string): unknown | null {
		try {
			const decrypted = this.cipher.decrypt(encryptedCredentialData);
			return JSON.parse(decrypted) as unknown;
		} catch {
			return null;
		}
	}

	private extractProviderKeys(expression: string): string[] {
		const providerKeys = new Set<string>();
		const expressionBlocks = expression.matchAll(/\{\{(.*?)\}\}/gs);

		for (const block of expressionBlocks) {
			const expressionContent = block[1];

			const dotMatches = expressionContent.matchAll(
				new RegExp(`\\$secrets\\.(${providerKeyPattern})`, 'g'),
			);
			for (const match of dotMatches) {
				providerKeys.add(match[1]);
			}

			const bracketMatches = expressionContent.matchAll(
				new RegExp(`\\$secrets\\[['"](${providerKeyPattern})['"]\\]`, 'g'),
			);
			for (const match of bracketMatches) {
				providerKeys.add(match[1]);
			}
		}

		return [...providerKeys];
	}

	private extractVariableKeys(expression: string): string[] {
		const variableKeys = new Set<string>();
		const expressionBlocks = expression.matchAll(/\{\{(.*?)\}\}/gs);

		for (const block of expressionBlocks) {
			const expressionContent = block[1];

			const dotMatches = expressionContent.matchAll(
				new RegExp(`\\$vars\\.(${variableKeyPattern})`, 'g'),
			);
			for (const match of dotMatches) {
				variableKeys.add(match[1]);
			}

			const bracketMatches = expressionContent.matchAll(
				new RegExp(`\\$vars\\[['"](${variableKeyPattern})['"]\\]`, 'g'),
			);
			for (const match of bracketMatches) {
				variableKeys.add(match[1]);
			}
		}

		return [...variableKeys];
	}

	private async insertDependencies(
		dependencies: Array<{
			credentialId: string;
			dependencyType: string;
			dependencyId: string;
		}>,
		escape: MigrationContext['escape'],
		runQuery: MigrationContext['runQuery'],
	) {
		const dependencyTable = escape.tableName(credentialDependencyTable);
		const credentialIdColumn = escape.columnName('credentialId');
		const dependencyTypeColumn = escape.columnName('dependencyType');
		const dependencyIdColumn = escape.columnName('dependencyId');

		const namedParameters: Record<string, string> = {};
		const valuesSql = dependencies
			.map((dependency, index) => {
				namedParameters[`credentialId${index}`] = dependency.credentialId;
				namedParameters[`dependencyType${index}`] = dependency.dependencyType;
				namedParameters[`dependencyId${index}`] = dependency.dependencyId;

				return `(:credentialId${index}, :dependencyType${index}, :dependencyId${index})`;
			})
			.join(', ');

		await runQuery(
			`INSERT INTO ${dependencyTable} (${credentialIdColumn}, ${dependencyTypeColumn}, ${dependencyIdColumn}) VALUES ${valuesSql} ON CONFLICT (${credentialIdColumn}, ${dependencyTypeColumn}, ${dependencyIdColumn}) DO NOTHING;`,
			namedParameters,
		);
	}

	private async loadProviderIdByKey(
		runQuery: MigrationContext['runQuery'],
		escape: MigrationContext['escape'],
	): Promise<Map<string, string>> {
		const providerTable = escape.tableName('secrets_provider_connection');
		const idColumn = escape.columnName('id');
		const providerKeyColumn = escape.columnName('providerKey');
		const rows = await runQuery<Array<{ id: number; providerKey: string }>>(
			`SELECT ${idColumn} AS id, ${providerKeyColumn} AS providerKey FROM ${providerTable}`,
		);

		return new Map(rows.map(({ id, providerKey }) => [providerKey, id.toString()]));
	}

	private async loadVariableIdsByProjectAndKey(
		runQuery: MigrationContext['runQuery'],
		escape: MigrationContext['escape'],
	): Promise<Map<string, Map<string, string[]>>> {
		const variablesTable = escape.tableName('variables');
		const idColumn = escape.columnName('id');
		const keyColumn = escape.columnName('key');
		const projectIdColumn = escape.columnName('projectId');
		const rows = await runQuery<Array<{ id: string; key: string; projectId: string | null }>>(
			`SELECT ${idColumn} AS id, ${keyColumn} AS key, ${projectIdColumn} AS projectId FROM ${variablesTable} WHERE ${projectIdColumn} IS NOT NULL`,
		);

		const idsByProjectAndKey = new Map<string, Map<string, string[]>>();
		for (const row of rows) {
			if (!row.projectId) continue;
			const idsByKey = idsByProjectAndKey.get(row.projectId) ?? new Map<string, string[]>();
			const ids = idsByKey.get(row.key) ?? [];
			ids.push(row.id);
			idsByKey.set(row.key, ids);
			idsByProjectAndKey.set(row.projectId, idsByKey);
		}

		return idsByProjectAndKey;
	}

	private async loadGlobalVariableIdsByKey(
		runQuery: MigrationContext['runQuery'],
		escape: MigrationContext['escape'],
	): Promise<Map<string, string[]>> {
		const variablesTable = escape.tableName('variables');
		const idColumn = escape.columnName('id');
		const keyColumn = escape.columnName('key');
		const projectIdColumn = escape.columnName('projectId');
		const rows = await runQuery<Array<{ id: string; key: string }>>(
			`SELECT ${idColumn} AS id, ${keyColumn} AS key FROM ${variablesTable} WHERE ${projectIdColumn} IS NULL`,
		);

		const idsByKey = new Map<string, string[]>();
		for (const row of rows) {
			const ids = idsByKey.get(row.key) ?? [];
			ids.push(row.id);
			idsByKey.set(row.key, ids);
		}

		return idsByKey;
	}

	private resolveVariableIdsForCredential(
		variableKey: string,
		ownerProjectId: string | null,
		variableIdsByProjectAndKey: Map<string, Map<string, string[]>>,
		globalVariableIdsByKey: Map<string, string[]>,
	): string[] {
		if (ownerProjectId) {
			const projectSpecificIds = variableIdsByProjectAndKey.get(ownerProjectId)?.get(variableKey);
			if (projectSpecificIds && projectSpecificIds.length > 0) {
				return projectSpecificIds;
			}
		}

		return globalVariableIdsByKey.get(variableKey) ?? [];
	}
}
