import { Service } from '@n8n/di';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class DotenvUpgradeRule implements IBreakingChangeInstanceRule {
	id: string = 'dotenv-upgrade-v2';
	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Upgrade dotenv',
			description:
				'The dotenv library has been upgraded, which may affect how .env files are parsed',
			category: BreakingChangeCategory.environment,
			severity: 'low',
			documentationUrl: 'https://docs.n8n.io/2-0-breaking-changes/#upgrade-dotenv',
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

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		};

		// check if default .env files exist and are likely being used
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

		result.isAffected = true;
		result.instanceIssues.push({
			title: 'dotenv library upgrade detected',
			description:
				'The dotenv library has been upgraded, which changes how values containing # or newlines are parsed. This may affect .env file parsing.',
			level: 'warning',
		});

		result.recommendations.push({
			action: 'Review .env files',
			description:
				'Ensure any values containing # or newlines are quoted appropriately. Avoid ambiguous unquoted usages that might now be interpreted differently.',
		});

		return result;
	}
}
