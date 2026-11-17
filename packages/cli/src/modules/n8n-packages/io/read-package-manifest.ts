import { packageManifestSchema, type PackageManifest } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';
import { ZodError } from 'zod';

import type { PackageReader } from './package-reader';

export async function readPackageManifest(reader: PackageReader): Promise<PackageManifest> {
	try {
		return packageManifestSchema.parse(await reader.readManifest());
	} catch (error) {
		if (error instanceof BadRequestError) throw error;
		if (error instanceof ZodError) {
			throw new BadRequestError('Package manifest failed validation');
		}
		throw new BadRequestError('Failed to read package manifest');
	}
}
