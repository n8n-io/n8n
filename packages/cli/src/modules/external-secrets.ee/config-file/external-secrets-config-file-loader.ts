import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { readFileSync } from 'fs';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { ExternalSecretsProviders } from '../external-secrets-providers.ee';

import { externalSecretsConfigFileConnectionSchema } from './external-secrets-config-file.schema';
import { resolveConfigFileSettings } from './external-secrets-config-value-resolver';

export interface LoadedExternalSecretsConnection {
	key: string;
	type: string;
	isEnabled: boolean;
	projectIds: string[];
	settings: Record<string, string>;
}

// Deliberately looser than `externalSecretsConfigFileSchema`: it only asserts the
// top-level shape (an array of connections to iterate). Each connection is then
// validated individually in the loop below, so a schema problem on one connection
// (e.g. an unknown `type` enum value) doesn't abort validation of the others —
// every problem in the file is collected before the whole load is rejected.
const configFileShapeSchema = z.object({ connections: z.array(z.unknown()) });

@Service()
export class ExternalSecretsConfigFileLoader {
	constructor(
		private readonly providers: ExternalSecretsProviders,
		private readonly projectRepository: ProjectRepository,
	) {}

	async load(filePath: string): Promise<LoadedExternalSecretsConnection[]> {
		const rawConnections = this.readConnections(filePath);
		const errors: string[] = [];
		const loaded: LoadedExternalSecretsConnection[] = [];

		for (let index = 0; index < rawConnections.length; index++) {
			const rawEntry = rawConnections[index];
			const context = `connection "${this.labelFor(rawEntry, index)}"`;

			const parsed = externalSecretsConfigFileConnectionSchema.safeParse(rawEntry);
			if (!parsed.success) {
				for (const issue of parsed.error.issues) {
					errors.push(`${context}: ${issue.path.join('.')}: ${issue.message}`);
				}
				continue;
			}

			const entry = parsed.data;

			if (!this.providers.hasProvider(entry.type)) {
				errors.push(
					`${context}: unknown provider type "${entry.type}". Valid types: ${Object.keys(
						this.providers.getAllProviders(),
					).join(', ')}`,
				);
				continue;
			}

			// Redaction only knows the provider's declared fields, so an undeclared key (e.g. a
			// typo of a password field) would come back unredacted from the connection API.
			const declaredSettings = new Set(
				new (this.providers.getProvider(entry.type))().properties.map((p) => p.name),
			);
			const unknownSettings = Object.keys(entry.settings).filter(
				(name) => !declaredSettings.has(name),
			);
			if (unknownSettings.length > 0) {
				errors.push(
					`${context}: unknown setting(s) for provider type "${entry.type}": ${unknownSettings.join(', ')}. Valid settings: ${[...declaredSettings].join(', ')}`,
				);
				continue;
			}

			const missingProjectIds: string[] = [];
			for (const projectId of entry.projectIds) {
				const project = await this.projectRepository.findOne({ where: { id: projectId } });
				if (!project) {
					missingProjectIds.push(projectId);
				}
			}
			if (missingProjectIds.length > 0) {
				errors.push(
					`${context}: references project ID(s) that do not exist: ${missingProjectIds.join(', ')}`,
				);
				continue;
			}

			try {
				const settings = resolveConfigFileSettings(entry.settings, context);
				loaded.push({
					key: entry.key,
					type: entry.type,
					isEnabled: entry.isEnabled,
					projectIds: entry.projectIds,
					settings,
				});
			} catch (error) {
				errors.push((error as Error).message);
			}
		}

		if (errors.length > 0) {
			throw new UserError(
				`External secrets config file "${filePath}" has invalid connection(s):\n${errors.join('\n')}`,
			);
		}

		return loaded;
	}

	/** Best-effort label for error messages: the raw `key` value if present, even if it will
	 * later fail validation, otherwise the connection's position in the array. */
	private labelFor(rawEntry: unknown, index: number): string {
		if (
			typeof rawEntry === 'object' &&
			rawEntry !== null &&
			typeof (rawEntry as Record<string, unknown>).key === 'string'
		) {
			return (rawEntry as Record<string, unknown>).key as string;
		}
		return `#${index}`;
	}

	private readConnections(filePath: string): unknown[] {
		let content: string;
		try {
			content = readFileSync(filePath, 'utf8');
		} catch (error) {
			throw new UserError(
				`Could not read external secrets config file "${filePath}": ${(error as Error).message}`,
			);
		}

		let json: unknown;
		try {
			json = JSON.parse(content);
		} catch (error) {
			throw new UserError(
				`External secrets config file "${filePath}" is not valid JSON: ${(error as Error).message}`,
			);
		}

		const shape = configFileShapeSchema.safeParse(json);
		if (!shape.success) {
			const issues = shape.error.issues
				.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
				.join('\n');
			throw new UserError(
				`External secrets config file "${filePath}" does not match the expected schema:\n${issues}`,
			);
		}

		return shape.data.connections;
	}
}
