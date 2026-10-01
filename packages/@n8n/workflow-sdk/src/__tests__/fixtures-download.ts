/**
 * Fixtures Download Utility
 *
 * Extracts real workflows from the committed zip file for testing.
 * The zip file (public_published_templates.zip) contains workflow JSON files
 * downloaded from n8n.io template library.
 *
 * To update the zip file with new workflows:
 * 1. Run `pnpm fetch-workflows` to download from API
 * 2. Run `pnpm create-workflows-zip` to package into zip
 * 3. Commit the updated zip file
 */

import * as path from 'path';

import { ensureWorkflowsExtracted, validateAllWorkflowsExist, zipExists } from './fixtures-zip';

export const DOWNLOADED_FIXTURES_DIR = path.resolve(
	__dirname,
	'../../test-fixtures/real-workflows',
);
export const COMMITTED_FIXTURES_DIR = path.resolve(
	__dirname,
	'../../test-fixtures/committed-workflows',
);

export class FixtureDownloadError extends Error {
	constructor(
		message: string,
		readonly cause?: Error,
	) {
		super(message);
		this.name = 'FixtureDownloadError';
	}
}

/**
 * Check if fixtures are available (zip file exists)
 */
export function fixturesExist(): boolean {
	return zipExists();
}

/**
 * Ensure fixtures are available by extracting from zip and validating.
 * @throws FixtureDownloadError if zip doesn't exist or validation fails
 */
export function ensureFixtures(): void {
	if (!zipExists()) {
		throw new FixtureDownloadError(
			'Workflow fixtures zip file not found. ' +
				'Ensure public_published_templates.zip is committed to test-fixtures/real-workflows/',
		);
	}

	// Extract from zip if needed
	try {
		ensureWorkflowsExtracted();
	} catch (error) {
		throw new FixtureDownloadError(
			'Failed to extract workflows from zip file',
			error instanceof Error ? error : undefined,
		);
	}

	// Validate all manifest workflows exist - fail if any missing
	try {
		validateAllWorkflowsExist();
	} catch (error) {
		throw new FixtureDownloadError(
			'Workflow validation failed: ' + (error instanceof Error ? error.message : String(error)),
			error instanceof Error ? error : undefined,
		);
	}
}
