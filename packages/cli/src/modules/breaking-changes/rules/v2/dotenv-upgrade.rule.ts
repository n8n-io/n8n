import { Service } from '@n8n/di';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

import type {
	BreakingChangeMetadata,
	InstanceDetectionResult,
	IBreakingChangeInstanceRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class DotenvUpgradeRule implements IBreakingChangeInstanceRule {
	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'dotenv-upgrade-v2',
			version: 'v2',
			title: 'Upgrade dotenv',
			description:
				'The dotenv library has been upgraded, which may affect how .env files are parsed',
			category: BreakingChangeCategory.environment,
			severity: BreakingChangeSeverity.medium,
		};
	}

	private async fileExists(path: string): Promise<boolean> {
		try {
			await access(path, constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	async detect(): Promise<InstanceDetectionResult> {
		const result: InstanceDetectionResult = {
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		};

		// Check if dotenv is being used by checking for DOTENV_CONFIG_PATH or common .env file locations
		const dotenvConfigPath = process.env.DOTENV_CONFIG_PATH;
		const isDotenvUsed = dotenvConfigPath !== undefined;

		if (!isDotenvUsed) {
			// If DOTENV_CONFIG_PATH is not set, check if default .env files exist and are likely being used
			const possibleEnvPaths = [
				join(process.cwd(), '.env'),
				join(process.cwd(), '.env.local'),
				join(process.cwd(), '.env.development'),
				join(process.cwd(), '.env.production'),
			];

			// Check files in parallel
			const existsChecks = await Promise.all(
				possibleEnvPaths.map(async (path) => ({
					path,
					exists: await this.fileExists(path),
				})),
			);

			const existingEnvFiles = existsChecks.filter((check) => check.exists);

			// Only flag as affected if .env files exist that could be loaded by dotenv
			if (existingEnvFiles.length === 0) {
				return result;
			}
		}

		result.isAffected = true;
		result.instanceIssues.push({
			title: 'dotenv library upgrade detected',
			description:
				'The dotenv library has been upgraded, which changes how values containing # or newlines are parsed. This may affect .env file parsing.',
			level: IssueLevel.warning,
		});

		result.recommendations.push({
			action: 'Review .env files',
			description:
				'Ensure any values containing # or newlines are quoted appropriately. Avoid ambiguous unquoted usages that might now be interpreted differently.',
		});

		return result;
	}
}
