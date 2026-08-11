import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const credentialDependencyTable = 'credential_dependency';
const externalSecretProviderDependencyType = 'externalSecretProvider';
const providerKeyPattern = '[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*';

type CredentialRow = {
	id: string;
	data: string;
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
		const query = `SELECT c.id AS id, c.data AS data FROM ${credentialsTable} c ORDER BY c.id`;
		const providerIdByKey = await this.loadProviderIdByKey(runQuery, escape);

		let processedCount = 0;
		let insertedCount = 0;

		await runInBatches<CredentialRow>(query, async (rows) => {
			if (rows.length === 0) return;

			const batchDependencies = rows.flatMap((row) => {
				const providerKeys = this.extractProviderKeysFromCredentialData(row.data);
				const providerIds = providerKeys
					.map((providerKey) => providerIdByKey.get(providerKey))
					.filter((providerId): providerId is string => providerId !== undefined);
				return providerIds.map((providerId) => ({
					credentialId: row.id,
					dependencyType: externalSecretProviderDependencyType,
					dependencyId: providerId,
				}));
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
		return this.extractProviderKeysFromDecryptedData(decrypted);
	}

	private extractProviderKeysFromDecryptedData(decryptedCredentialData: unknown): string[] {
		const uniqueKeys = new Set<string>();
		const valuesToScan: unknown[] = [decryptedCredentialData];

		while (valuesToScan.length > 0) {
			const currentValue = valuesToScan.pop();
			if (typeof currentValue === 'string') {
				if (!currentValue.includes('$secrets')) continue;
				for (const dependencyKey of this.extractProviderKeys(currentValue)) {
					uniqueKeys.add(dependencyKey);
				}
				continue;
			}

			if (Array.isArray(currentValue)) {
				for (const value of currentValue as unknown[]) {
					valuesToScan.push(value);
				}
				continue;
			}

			if (typeof currentValue === 'object' && currentValue !== null) {
				for (const value of Object.values(currentValue as Record<string, unknown>)) {
					valuesToScan.push(value);
				}
			}
		}

		return [...uniqueKeys];
	}

	private tryDecryptCredentialData(encryptedCredentialData: string): unknown {
		try {
			const decrypted = this.cipher.decryptWithInstanceKey(encryptedCredentialData);
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
			`SELECT ${idColumn} AS ${idColumn}, ${providerKeyColumn} AS ${providerKeyColumn} FROM ${providerTable}`,
		);

		return new Map(rows.map(({ id, providerKey }) => [providerKey, id.toString()]));
	}
}
