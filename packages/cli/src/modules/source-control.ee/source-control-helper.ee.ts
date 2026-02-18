import type { SourceControlledFile } from '@n8n/api-types';
import { isContainedWithin, Logger, safeJoinPath } from '@n8n/backend-common';
import type { TagEntity, WorkflowTagMapping } from '@n8n/db';
import { Container } from '@n8n/di';
import { generateKeyPairSync } from 'crypto';
import { accessSync, constants as fsConstants, mkdirSync } from 'fs';
import isEqual from 'lodash/isEqual';
import {
	deepCopy,
	jsonParse,
	UserError,
	type CredentialInformation,
	type DataTableColumnType,
	type ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { ok } from 'node:assert/strict';
import { readFile as fsReadFile } from 'node:fs/promises';
import path from 'path';

import { License } from '@/license';

import {
	SOURCE_CONTROL_FOLDERS_EXPORT_FILE,
	SOURCE_CONTROL_GIT_KEY_COMMENT,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_VARIABLES_EXPORT_FILE,
} from './constants';
import type { StatusExportableCredential } from './types/exportable-credential';
import type {
	ExportableDataTable,
	ExportableDataTableColumn,
	StatusExportableDataTable,
} from './types/exportable-data-table';
import type { ExportedFolders } from './types/exportable-folders';
import type { KeyPair } from './types/key-pair';
import type { KeyPairType } from './types/key-pair-type';
import type { RemoteResourceOwner, StatusResourceOwner } from './types/resource-owner';
import type { SourceControlWorkflowVersionId } from './types/source-control-workflow-version-id';

function stringContainsExpression(testString: string): boolean {
	return /^=.*\{\{.+\}\}/.test(testString);
}

export function sanitizeCredentialData(
	data: ICredentialDataDecryptedObject,
): ICredentialDataDecryptedObject {
	const result: ICredentialDataDecryptedObject = deepCopy(data);

	for (const [key, value] of Object.entries(data)) {
		if (value === null || key === 'oauthTokenData') {
			// `oauthTokenData` is not synchable to force the pulling instance to reconnect
			delete result[key];
		} else if (typeof value === 'object') {
			result[key] = sanitizeCredentialData(value as ICredentialDataDecryptedObject);
		} else if (typeof value === 'string') {
			result[key] = stringContainsExpression(value) ? value : '';
		}

		// NOTE: number and boolean values are synchable for backward compatibility
		// Typically numbers represent PORT numbers or other numeric values that aren't sensitives
		// Boolean are usually represent non sensitive flags
		// This could be revisited in the future
	}

	return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Recursively merges a single value based on its type.
 * Handles strings, numbers, booleans, arrays, and plain objects.
 */
function mergeSingleValue(sanitizedRemoteValue: unknown, localValue: unknown): unknown {
	if (typeof sanitizedRemoteValue === 'string') {
		if (stringContainsExpression(sanitizedRemoteValue)) {
			return sanitizedRemoteValue;
		} else if (localValue !== undefined && localValue !== null) {
			// Local value is preserved if it exists (secret handling)
			return localValue;
		}

		return undefined;
	}

	if (typeof sanitizedRemoteValue === 'number' || typeof sanitizedRemoteValue === 'boolean') {
		return sanitizedRemoteValue;
	}

	if (Array.isArray(sanitizedRemoteValue)) {
		// Only merge by index if lengths match, otherwise array structure has changed
		// and we can't reliably match items (could be additions/removals/reordering)
		if (Array.isArray(localValue) && localValue.length === sanitizedRemoteValue.length) {
			return sanitizedRemoteValue.map((sanitizedItem, index) => {
				const localItem = localValue[index];
				return mergeSingleValue(sanitizedItem, localItem);
			});
		}

		return sanitizedRemoteValue;
	}

	if (isPlainObject(sanitizedRemoteValue)) {
		if (isPlainObject(localValue)) {
			return mergeRemoteCrendetialDataIntoLocalCredentialData({
				local: localValue as ICredentialDataDecryptedObject,
				remote: sanitizedRemoteValue as ICredentialDataDecryptedObject,
			});
		}

		return sanitizedRemoteValue;
	}

	return undefined;
}

/**
 * Merges remote credential data into local data.
 * Remote expressions, numbers and boolean values overwrite local values.
 */
export function mergeRemoteCrendetialDataIntoLocalCredentialData({
	local,
	remote,
}: {
	local: ICredentialDataDecryptedObject;
	remote: ICredentialDataDecryptedObject;
}): ICredentialDataDecryptedObject {
	const merged: ICredentialDataDecryptedObject = {};

	// This is a safe guard, in principle remote data should already be sanitized
	// This prevents importing invalid data that should have not been synched in the first place
	const sanitizedRemote = sanitizeCredentialData(remote);

	for (const [key, sanitizedRemoteValue] of Object.entries(sanitizedRemote)) {
		const localValue = local[key];
		const mergedValue = mergeSingleValue(sanitizedRemoteValue, localValue);

		if (mergedValue !== undefined) {
			merged[key] = mergedValue as CredentialInformation;
		}
	}

	return merged;
}

export function getWorkflowExportPath(workflowId: string, workflowExportFolder: string): string {
	return safeJoinPath(workflowExportFolder, `${workflowId}.json`);
}

export function getProjectExportPath(projectId: string, projectExportFolder: string): string {
	return safeJoinPath(projectExportFolder, `${projectId}.json`);
}

export function getCredentialExportPath(
	credentialId: string,
	credentialExportFolder: string,
): string {
	return safeJoinPath(credentialExportFolder, `${credentialId}.json`);
}

export function getDataTableExportPath(dataTableId: string, dataTableExportFolder: string): string {
	return safeJoinPath(dataTableExportFolder, `${dataTableId}.json`);
}

export function getVariablesPath(gitFolder: string): string {
	return safeJoinPath(gitFolder, SOURCE_CONTROL_VARIABLES_EXPORT_FILE);
}

export function getTagsPath(gitFolder: string): string {
	return safeJoinPath(gitFolder, SOURCE_CONTROL_TAGS_EXPORT_FILE);
}

export function getFoldersPath(gitFolder: string): string {
	return safeJoinPath(gitFolder, SOURCE_CONTROL_FOLDERS_EXPORT_FILE);
}

export async function readTagAndMappingsFromSourceControlFile(file: string): Promise<{
	tags: TagEntity[];
	mappings: WorkflowTagMapping[];
}> {
	try {
		return jsonParse<{ tags: TagEntity[]; mappings: WorkflowTagMapping[] }>(
			await fsReadFile(file, { encoding: 'utf8' }),
			{ fallbackValue: { tags: [], mappings: [] } },
		);
	} catch (error) {
		// Return fallback if file not found
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return { tags: [], mappings: [] };
		}
		throw error;
	}
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof (error as { code: unknown }).code === 'string'
	);
}

export async function readFoldersFromSourceControlFile(file: string): Promise<ExportedFolders> {
	try {
		return jsonParse<ExportedFolders>(await fsReadFile(file, { encoding: 'utf8' }), {
			fallbackValue: { folders: [] },
		});
	} catch (error) {
		if (isErrnoException(error) && error.code === 'ENOENT') {
			return { folders: [] };
		}
		throw error;
	}
}

export async function readDataTablesFromSourceControlFile(
	file: string,
): Promise<ExportableDataTable[]> {
	try {
		return jsonParse<ExportableDataTable[]>(await fsReadFile(file, { encoding: 'utf8' }), {
			fallbackValue: [],
		});
	} catch (error) {
		if (isErrnoException(error) && error.code === 'ENOENT') {
			return [];
		}
		throw error;
	}
}

export function sourceControlFoldersExistCheck(
	folders: string[],
	createIfNotExists = true,
): boolean {
	// running these file access function synchronously to avoid race conditions
	let existed = true;
	folders.forEach((folder) => {
		try {
			accessSync(folder, fsConstants.F_OK);
		} catch {
			existed = false;
			if (createIfNotExists) {
				try {
					mkdirSync(folder, { recursive: true });
				} catch (error) {
					Container.get(Logger).error((error as Error).message);
				}
			}
		}
	});
	return existed;
}

export function isSourceControlLicensed() {
	const license = Container.get(License);
	return license.isSourceControlLicensed();
}

export async function generateSshKeyPair(keyType: KeyPairType) {
	const sshpk = await import('sshpk');
	const keyPair: KeyPair = {
		publicKey: '',
		privateKey: '',
	};
	let generatedKeyPair: KeyPair;
	switch (keyType) {
		case 'ed25519':
			generatedKeyPair = generateKeyPairSync('ed25519', {
				privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
				publicKeyEncoding: { format: 'pem', type: 'spki' },
			});
			break;
		case 'rsa':
			generatedKeyPair = generateKeyPairSync('rsa', {
				modulusLength: 4096,
				publicKeyEncoding: {
					type: 'spki',
					format: 'pem',
				},
				privateKeyEncoding: {
					type: 'pkcs8',
					format: 'pem',
				},
			});
			break;
	}
	const keyPublic = sshpk.parseKey(generatedKeyPair.publicKey, 'pem');
	keyPublic.comment = SOURCE_CONTROL_GIT_KEY_COMMENT;
	keyPair.publicKey = keyPublic.toString('ssh');
	const keyPrivate = sshpk.parsePrivateKey(generatedKeyPair.privateKey, 'pem');
	keyPrivate.comment = SOURCE_CONTROL_GIT_KEY_COMMENT;
	keyPair.privateKey = keyPrivate.toString('ssh-private');
	return {
		privateKey: keyPair.privateKey,
		publicKey: keyPair.publicKey,
	};
}

export function getRepoType(repoUrl: string): 'github' | 'gitlab' | 'other' {
	if (repoUrl.includes('github.com')) {
		return 'github';
	} else if (repoUrl.includes('gitlab.com')) {
		return 'gitlab';
	}
	return 'other';
}

function filterSourceControlledFilesUniqueIds(files: SourceControlledFile[]) {
	if (!files || !Array.isArray(files)) {
		return [];
	}
	return files.filter((file, index, self) => {
		return self.findIndex((f) => f.id === file.id) === index;
	});
}

export function getTrackingInformationFromPullResult(
	userId: string,
	result: SourceControlledFile[],
) {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
		userId,
		credConflicts: uniques.filter(
			(file) =>
				file.type === 'credential' && file.status === 'modified' && file.location === 'local',
		).length,
		workflowConflicts: uniques.filter(
			(file) => file.type === 'workflow' && file.status === 'modified' && file.location === 'local',
		).length,
		workflowUpdates: uniques.filter((file) => file.type === 'workflow').length,
	};
}

export function getTrackingInformationFromPrePushResult(
	userId: string,
	result: SourceControlledFile[],
) {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
		userId,
		workflowsEligible: uniques.filter((file) => file.type === 'workflow').length,
		workflowsEligibleWithConflicts: uniques.filter(
			(file) => file.type === 'workflow' && file.conflict,
		).length,
		credsEligible: uniques.filter((file) => file.type === 'credential').length,
		credsEligibleWithConflicts: uniques.filter(
			(file) => file.type === 'credential' && file.conflict,
		).length,
		variablesEligible: uniques.filter((file) => file.type === 'variables').length,
	};
}

export function getTrackingInformationFromPostPushResult(
	userId: string,
	result: SourceControlledFile[],
) {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
		userId,
		workflowsPushed: uniques.filter((file) => file.pushed && file.type === 'workflow').length ?? 0,
		workflowsEligible: uniques.filter((file) => file.type === 'workflow').length ?? 0,
		credsPushed:
			uniques.filter((file) => file.pushed && file.file.startsWith('credential_stubs')).length ?? 0,
		variablesPushed:
			uniques.filter((file) => file.pushed && file.file.startsWith('variable_stubs')).length ?? 0,
	};
}

/**
 * Normalizes and validates the given source controlled file path. Ensures
 * the path is absolute and contained within the git folder.
 *
 * @throws {UserError} If the path is not within the git folder
 */
export function normalizeAndValidateSourceControlledFilePath(
	gitFolderPath: string,
	filePath: string,
) {
	ok(path.isAbsolute(gitFolderPath), 'gitFolder must be an absolute path');

	const normalizedPath = path.isAbsolute(filePath)
		? filePath
		: safeJoinPath(gitFolderPath, filePath);

	if (!isContainedWithin(gitFolderPath, filePath)) {
		throw new UserError(`File path ${filePath} is invalid`);
	}

	return normalizedPath;
}

export function hasOwnerChanged(
	owner1?: RemoteResourceOwner | StatusResourceOwner | null,
	owner2?: StatusResourceOwner | null,
): boolean {
	// We only compare owners when there is at least one team owner
	// because personal owners projects are not synced with source control

	// If either is missing, check if the other is a team owner
	if (!owner1 || !owner2) {
		// If one exists and is a team owner, the absence of the other is a change
		const existingOwner = owner1 || owner2;
		if (!existingOwner) return false;
		if (typeof existingOwner === 'string') return false;
		return existingOwner.type === 'team';
	}

	// Handle string format (legacy personal email)
	if (typeof owner1 === 'string') {
		return false; // Personal projects are not synced
	}

	if (owner1.type !== 'team' && owner2.type !== 'team') {
		return false;
	}

	// For team projects, compare IDs
	// owner1 could be TeamResourceOwner (with teamId) or StatusResourceOwner (with projectId)
	// owner2 could also be TeamResourceOwner (with teamId) or StatusResourceOwner (with projectId)
	const owner1TeamId = 'teamId' in owner1 ? owner1.teamId : owner1.projectId;
	const owner2TeamId = 'teamId' in owner2 ? owner2.teamId : owner2.projectId;
	return owner1TeamId !== owner2TeamId;
}

/**
 * Checks if a workflow has been modified by comparing version IDs and parent folder IDs
 * between local and remote versions
 */
export function isWorkflowModified(
	local: SourceControlWorkflowVersionId,
	remote: SourceControlWorkflowVersionId,
): boolean {
	const hasVersionIdChanged = remote.versionId !== local.versionId;
	const hasParentFolderIdChanged =
		remote.parentFolderId !== undefined && remote.parentFolderId !== local.parentFolderId;
	const ownerChanged = hasOwnerChanged(remote.owner, local.owner);

	return hasVersionIdChanged || hasParentFolderIdChanged || ownerChanged;
}

/**
 * Compares two data table columns arrays to check if they are equal
 */
function areDataTableColumnsEqual(
	localColumns: ExportableDataTableColumn[],
	remoteColumns: ExportableDataTableColumn[],
): boolean {
	if (localColumns.length !== remoteColumns.length) {
		return false;
	}

	const sortedLocal = [...localColumns].sort((a, b) => a.id.localeCompare(b.id));
	const sortedRemote = [...remoteColumns].sort((a, b) => a.id.localeCompare(b.id));

	return sortedLocal.every((localCol, idx) => {
		const remoteCol = sortedRemote[idx];
		return (
			localCol.id === remoteCol.id &&
			localCol.name === remoteCol.name &&
			localCol.type === remoteCol.type &&
			localCol.index === remoteCol.index
		);
	});
}

/**
 * Checks if a data table has been modified by comparing basic properties and schema (columns)
 * between local and remote versions.
 *
 * Data tables only use PersonalResourceOwner or TeamResourceOwner (no legacy string format).
 */
export function isDataTableModified(
	localDt: StatusExportableDataTable,
	remoteDt: ExportableDataTable,
): boolean {
	if (localDt.name !== remoteDt.name) {
		return true;
	}

	const ownerChanged = hasOwnerChanged(remoteDt.ownedBy, localDt.ownedBy);
	if (ownerChanged) {
		return true;
	}

	return !areDataTableColumnsEqual(localDt.columns, remoteDt.columns);
}

/**
 * Type guard to check if a string is a valid DataTableColumnType.
 */
export function isValidDataTableColumnType(type: string): type is DataTableColumnType {
	return ['string', 'number', 'boolean', 'date'].includes(type);
}

export function areSameCredentials(
	credA: StatusExportableCredential,
	credB: StatusExportableCredential,
): boolean {
	return (
		credA.name === credB.name &&
		credA.type === credB.type &&
		!hasOwnerChanged(credA.ownedBy, credB.ownedBy) &&
		Boolean(credA.isGlobal) === Boolean(credB.isGlobal) &&
		!hasSynchableCredentialDataChanged(credA.data, credB.data)
	);
}

function hasSynchableCredentialDataChanged(
	data1: ICredentialDataDecryptedObject | undefined,
	data2: ICredentialDataDecryptedObject | undefined,
): boolean {
	if (!data1 && !data2) return false;
	if (!data1 || !data2) return true;

	const sanitizedData1 = sanitizeCredentialData(data1);
	const sanitizedData2 = sanitizeCredentialData(data2);
	return !isEqual(sanitizedData1, sanitizedData2);
}
