import type { SourceControlPreferencesResponse } from '@n8n/api-types';

export type SshKeyTypes = ['ed25519', 'rsa'];
export type KeyGeneratorType = 'ed25519' | 'rsa';

/**
 * Protocol types for source control authentication
 */
export type SourceControlProtocol = 'ssh' | 'https';
export type SourceControlProtocols = [SourceControlProtocol, SourceControlProtocol];

/**
 * Extended source control preferences that includes frontend-specific fields
 * while maintaining compatibility with the backend API response type
 */
export type SourceControlPreferences = SourceControlPreferencesResponse & {
	branches: string[];
	currentBranch?: string;
};

/**
 * Form data type for HTTPS authentication - includes sensitive fields
 * that are only used in forms and not stored in preferences
 */
export interface SourceControlHttpsFormData {
	protocol: SourceControlProtocol;
	username?: string;
	personalAccessToken?: string;
}

/**
 * Complete form data type for source control setup
 * Combines preferences with authentication form fields
 * Explicitly excludes sensitive and read-only fields for security
 */
export interface SourceControlFormData
	extends Omit<SourceControlPreferences, 'connected' | 'branches' | 'publicKey'> {
	personalAccessToken?: string;
	initRepo?: boolean;
}

/**
 * Validation rule type for form fields - Element Plus compatible
 */
export interface SourceControlValidationRule {
	required?: boolean;
	message?: string;
	trigger?: 'blur' | 'change';
	validator?: (
		rule: ElementPlusValidationRule,
		value: string | undefined,
		done: (error?: Error) => void,
	) => void;
}

/**
 * Element Plus validation rule interface
 */
export interface ElementPlusValidationRule {
	required?: boolean;
	message?: string;
	trigger?: string | string[];
	field?: string;
}

/**
 * Validation rules for source control form fields
 */
export interface SourceControlValidationRules {
	repositoryUrl?: SourceControlValidationRule[];
	branchName?: SourceControlValidationRule[];
	username?: SourceControlValidationRule[];
	personalAccessToken?: SourceControlValidationRule[];
}

/**
 * Protocol option for UI selection components
 */
export interface ProtocolOption {
	value: SourceControlProtocol;
	label: string;
	description: string;
}

/**
 * Protocol-specific validation requirements
 */
export interface ProtocolRequirements {
	requiredFields: Array<keyof SourceControlFormData>;
	optionalFields: Array<keyof SourceControlFormData>;
	validationMessage: string;
}

/**
 * Form validation state interface
 */
export interface FormValidationState {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	hasErrors: boolean;
	hasWarnings: boolean;
}

export interface SourceControlStatus {
	ahead: number;
	behind: number;
	conflicted: string[];
	created: string[];
	current: string;
	deleted: string[];
	detached: boolean;
	files: Array<{
		path: string;
		index: string;
		working_dir: string;
	}>;
	modified: string[];
	not_added: string[];
	renamed: string[];
	staged: string[];
	tracking: null;
}
