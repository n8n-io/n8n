import type {
	CredentialSetupField,
	CredentialSetupOutput,
	CredentialSetupSafeResult,
} from '../../shared/credential-setup';

export type CredentialSetupFormData = Record<string, unknown>;

export function isCredentialSetupOutput(value: unknown): value is CredentialSetupOutput {
	if (!isRecord(value)) return false;

	return (
		(value.setupSessionId === undefined || typeof value.setupSessionId === 'string') &&
		typeof value.credentialType === 'string' &&
		typeof value.credentialDisplayName === 'string' &&
		typeof value.credentialName === 'string' &&
		(value.projectId === undefined || typeof value.projectId === 'string') &&
		(value.nodeType === undefined || typeof value.nodeType === 'string') &&
		(value.purpose === undefined || typeof value.purpose === 'string') &&
		typeof value.isOAuth === 'boolean' &&
		(value.oauthVersion === undefined ||
			value.oauthVersion === 'oauth1' ||
			value.oauthVersion === 'oauth2') &&
		Array.isArray(value.fields) &&
		value.fields.every(isCredentialSetupField) &&
		typeof value.hasUnsupportedFields === 'boolean' &&
		Array.isArray(value.unsupportedFieldNames) &&
		value.unsupportedFieldNames.every((fieldName) => typeof fieldName === 'string') &&
		typeof value.fallbackUrl === 'string'
	);
}

export function isCredentialSetupSafeResult(value: unknown): value is CredentialSetupSafeResult {
	if (!isRecord(value)) return false;

	return (
		(value.credentialId === undefined || typeof value.credentialId === 'string') &&
		(value.credentialName === undefined || typeof value.credentialName === 'string') &&
		typeof value.credentialType === 'string' &&
		isCredentialSetupStatus(value.status) &&
		(value.connected === undefined || typeof value.connected === 'boolean') &&
		(value.authorizationUrl === undefined || typeof value.authorizationUrl === 'string') &&
		(value.fallbackUrl === undefined || typeof value.fallbackUrl === 'string') &&
		(value.error === undefined || typeof value.error === 'string')
	);
}

export function createInitialFormData(fields: CredentialSetupField[]): CredentialSetupFormData {
	const data: CredentialSetupFormData = {};
	for (const field of fields) {
		if (field.type === 'notice') continue;

		if (field.default !== undefined) {
			data[field.name] = field.default;
			continue;
		}

		if (field.type === 'boolean') {
			data[field.name] = false;
		} else if (field.type === 'multiOptions') {
			data[field.name] = [];
		} else {
			data[field.name] = '';
		}
	}

	return data;
}

export function buildCredentialCreateArguments(
	setup: CredentialSetupOutput,
	data: CredentialSetupFormData,
) {
	return {
		setupSessionId: setup.setupSessionId,
		credentialType: setup.credentialType,
		name: setup.credentialName,
		projectId: setup.projectId,
		data: serializeCredentialData(setup.fields, data),
	};
}

export function serializeCredentialData(
	fields: CredentialSetupField[],
	data: CredentialSetupFormData,
): Record<string, unknown> {
	const serialized: Record<string, unknown> = {};
	for (const field of fields) {
		if (field.type === 'notice') continue;

		const value = data[field.name];
		if (value === undefined || value === '') continue;

		if (field.type === 'number') {
			serialized[field.name] = typeof value === 'number' ? value : Number(value);
		} else if (field.type === 'boolean') {
			serialized[field.name] = value === true;
		} else if (field.type === 'multiOptions') {
			serialized[field.name] = Array.isArray(value) ? value.filter(isString) : [];
		} else {
			serialized[field.name] = value;
		}
	}

	return serialized;
}

function isCredentialSetupField(value: unknown): value is CredentialSetupField {
	if (!isRecord(value)) return false;

	return (
		typeof value.name === 'string' &&
		typeof value.displayName === 'string' &&
		isCredentialSetupFieldType(value.type) &&
		typeof value.required === 'boolean' &&
		typeof value.password === 'boolean' &&
		(value.description === undefined || typeof value.description === 'string') &&
		(value.options === undefined ||
			(Array.isArray(value.options) && value.options.every(isCredentialSetupFieldOption)))
	);
}

function isCredentialSetupFieldOption(value: unknown): boolean {
	if (!isRecord(value)) return false;

	return (
		typeof value.name === 'string' &&
		(typeof value.value === 'string' ||
			typeof value.value === 'number' ||
			typeof value.value === 'boolean') &&
		(value.description === undefined || typeof value.description === 'string')
	);
}

function isCredentialSetupFieldType(value: unknown): boolean {
	return (
		value === 'string' ||
		value === 'number' ||
		value === 'boolean' ||
		value === 'options' ||
		value === 'multiOptions' ||
		value === 'json' ||
		value === 'notice'
	);
}

function isCredentialSetupStatus(value: unknown): boolean {
	return (
		value === 'setup_required' ||
		value === 'created' ||
		value === 'authorization_required' ||
		value === 'pending' ||
		value === 'connected' ||
		value === 'tested' ||
		value === 'deleted' ||
		value === 'error'
	);
}

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
