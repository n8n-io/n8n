import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { readFile } from 'fs/promises';

import config from '@/config';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

interface SecurityValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	recommendations: string[];
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface EncryptionResult {
	encryptedData: string;
	iv: string;
	salt: string;
	tag: string;
}

interface DecryptionParams {
	encryptedData: string;
	iv: string;
	salt: string;
	tag: string;
	key: string;
}

@Service()
export class MigrationSecurityService {
	private readonly algorithm = 'aes-256-gcm';
	private readonly keyLength = 32;
	private readonly ivLength = 16;
	private readonly saltLength = 32;
	private readonly tagLength = 16;

	constructor(private readonly logger: Logger) {}

	/**
	 * Validates if a user has permission to perform migration operations
	 */
	async validateMigrationPermissions(
		user: User,
		operation: 'export' | 'import' | 'transfer',
	): Promise<void> {
		this.logger.debug('Validating migration permissions', {
			userId: user.id,
			operation,
			userRole: user.role,
		});

		// Only global owners and admins can perform migration operations
		if (!user.role || !['global:owner', 'global:admin'].includes(user.role)) {
			throw new ForbiddenError('Insufficient permissions for migration operations');
		}

		// Additional check for cross-instance transfers (most sensitive operation)
		if (operation === 'transfer' && user.role !== 'global:owner') {
			throw new ForbiddenError('Only instance owners can perform cross-instance transfers');
		}

		this.logger.debug('Migration permissions validated successfully', {
			userId: user.id,
			operation,
		});
	}

	/**
	 * Validates export data integrity and security
	 */
	async validateExportData(
		exportData: any,
		options: {
			checkIntegrity?: boolean;
			validateCredentials?: boolean;
			checkForSensitiveData?: boolean;
		} = {},
	): Promise<SecurityValidationResult> {
		const result: SecurityValidationResult = {
			isValid: true,
			errors: [],
			warnings: [],
			recommendations: [],
			riskLevel: 'low',
		};

		try {
			// Basic structure validation
			if (!exportData || typeof exportData !== 'object') {
				result.errors.push('Invalid export data structure');
				result.isValid = false;
				result.riskLevel = 'critical';
				return result;
			}

			// Check for required metadata
			if (!exportData.metadata) {
				result.errors.push('Missing export metadata');
				result.isValid = false;
				result.riskLevel = 'high';
			}

			// Validate metadata structure
			if (exportData.metadata) {
				const metadata = exportData.metadata;
				if (!metadata.id || !metadata.version || !metadata.createdAt) {
					result.errors.push('Invalid metadata structure');
					result.isValid = false;
					result.riskLevel = 'high';
				}

				// Check export age
				if (metadata.createdAt) {
					const exportAge = Date.now() - new Date(metadata.createdAt).getTime();
					const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
					if (exportAge > maxAge) {
						result.warnings.push('Export data is older than 7 days');
						result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
					}
				}

				// Version compatibility check
				if (metadata.source?.n8nVersion) {
					const currentVersion = process.env.N8N_VERSION;
					if (currentVersion && metadata.source.n8nVersion !== currentVersion) {
						result.warnings.push(
							`Version mismatch: export from ${metadata.source.n8nVersion}, current ${currentVersion}`,
						);
						result.recommendations.push(
							'Verify compatibility between n8n versions before importing',
						);
					}
				}
			}

			// Check for sensitive data if requested
			if (options.checkForSensitiveData) {
				this.checkForSensitiveData(exportData, result);
			}

			// Validate credentials if requested
			if (options.validateCredentials && exportData.credentials) {
				this.validateCredentialSecurity(exportData.credentials, result);
			}

			// Check workflows for potential security issues
			if (exportData.workflows) {
				this.validateWorkflowSecurity(exportData.workflows, result);
			}

			// Data size validation
			const dataSize = JSON.stringify(exportData).length;
			const maxSize = 100 * 1024 * 1024; // 100MB
			if (dataSize > maxSize) {
				result.warnings.push('Export data is very large and may cause performance issues');
				result.recommendations.push('Consider exporting data in smaller chunks');
			}

			this.logger.debug('Export data validation completed', {
				isValid: result.isValid,
				errors: result.errors.length,
				warnings: result.warnings.length,
				riskLevel: result.riskLevel,
			});

			return result;
		} catch (error) {
			this.logger.error('Error validating export data', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			result.errors.push('Failed to validate export data');
			result.isValid = false;
			result.riskLevel = 'critical';
			return result;
		}
	}

	/**
	 * Validates target instance security for cross-instance transfers
	 */
	async validateTargetInstanceSecurity(
		targetUrl: string,
		credentials: any,
	): Promise<SecurityValidationResult> {
		const result: SecurityValidationResult = {
			isValid: true,
			errors: [],
			warnings: [],
			recommendations: [],
			riskLevel: 'low',
		};

		try {
			// URL validation
			const url = new URL(targetUrl);

			// Check for HTTPS
			if (url.protocol !== 'https:') {
				result.warnings.push('Target instance is not using HTTPS');
				result.recommendations.push('Use HTTPS for secure data transfer');
				result.riskLevel = 'medium';
			}

			// Check for localhost or private IP ranges (potential security risk)
			const hostname = url.hostname.toLowerCase();
			if (
				hostname === 'localhost' ||
				hostname === '127.0.0.1' ||
				hostname.startsWith('192.168.') ||
				hostname.startsWith('10.') ||
				hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
			) {
				result.warnings.push('Target instance appears to be on a local or private network');
				result.recommendations.push(
					'Ensure network security and access controls are properly configured',
				);
			}

			// Validate authentication method
			if (
				!credentials.apiKey &&
				!credentials.authToken &&
				!(credentials.username && credentials.password)
			) {
				result.errors.push('No valid authentication method provided');
				result.isValid = false;
				result.riskLevel = 'critical';
			}

			// Check for weak passwords
			if (credentials.password && credentials.password.length < 8) {
				result.warnings.push('Target instance password appears to be weak');
				result.recommendations.push('Use strong passwords for better security');
			}

			// API key validation
			if (credentials.apiKey) {
				if (credentials.apiKey.length < 32) {
					result.warnings.push('API key appears to be short, which may indicate weak security');
				}
			}

			return result;
		} catch (error) {
			result.errors.push(
				`Invalid target URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			result.isValid = false;
			result.riskLevel = 'high';
			return result;
		}
	}

	/**
	 * Encrypts sensitive data for secure transfer
	 */
	async encryptSensitiveData(data: string, password: string): Promise<EncryptionResult> {
		try {
			// Generate random salt and IV
			const salt = randomBytes(this.saltLength);
			const iv = randomBytes(this.ivLength);

			// Derive key from password using PBKDF2
			const key = await this.deriveKey(password, salt);

			// Create cipher
			const cipher = createCipheriv(this.algorithm, key, iv);

			// Encrypt the data
			let encrypted = cipher.update(data, 'utf8', 'hex');
			encrypted += cipher.final('hex');

			// Get authentication tag
			const tag = cipher.getAuthTag();

			return {
				encryptedData: encrypted,
				iv: iv.toString('hex'),
				salt: salt.toString('hex'),
				tag: tag.toString('hex'),
			};
		} catch (error) {
			this.logger.error('Failed to encrypt sensitive data', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new InternalServerError('Failed to encrypt sensitive data');
		}
	}

	/**
	 * Decrypts sensitive data
	 */
	async decryptSensitiveData(params: DecryptionParams): Promise<string> {
		try {
			// Convert hex strings back to buffers
			const salt = Buffer.from(params.salt, 'hex');
			const iv = Buffer.from(params.iv, 'hex');
			const tag = Buffer.from(params.tag, 'hex');

			// Derive key from password
			const key = await this.deriveKey(params.key, salt);

			// Create decipher
			const decipher = createDecipheriv(this.algorithm, key, iv);
			decipher.setAuthTag(tag);

			// Decrypt the data
			let decrypted = decipher.update(params.encryptedData, 'hex', 'utf8');
			decrypted += decipher.final('utf8');

			return decrypted;
		} catch (error) {
			this.logger.error('Failed to decrypt sensitive data', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new BadRequestError('Failed to decrypt data - invalid key or corrupted data');
		}
	}

	/**
	 * Generates a secure random token for migration operations
	 */
	generateSecureToken(length = 32): string {
		return randomBytes(length).toString('hex');
	}

	/**
	 * Validates a migration token
	 */
	validateMigrationToken(token: string, expectedLength = 64): boolean {
		if (!token || typeof token !== 'string') {
			return false;
		}

		// Check length
		if (token.length !== expectedLength) {
			return false;
		}

		// Check if it's valid hex
		return /^[0-9a-f]+$/i.test(token);
	}

	/**
	 * Creates a hash of the export data for integrity verification
	 */
	createDataHash(data: any): string {
		const dataString = JSON.stringify(data, Object.keys(data).sort());
		return createHash('sha256').update(dataString).digest('hex');
	}

	/**
	 * Verifies data integrity using hash
	 */
	verifyDataIntegrity(data: any, expectedHash: string): boolean {
		const actualHash = this.createDataHash(data);
		return actualHash === expectedHash;
	}

	// Private helper methods

	private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const crypto = require('crypto');
			crypto.pbkdf2(
				password,
				salt,
				100000,
				this.keyLength,
				'sha256',
				(err: any, derivedKey: Buffer) => {
					if (err) reject(err);
					else resolve(derivedKey);
				},
			);
		});
	}

	private checkForSensitiveData(exportData: any, result: SecurityValidationResult): void {
		// Check for potential sensitive data patterns
		const sensitivePatterns = [
			/password/i,
			/secret/i,
			/token/i,
			/key/i,
			/api_key/i,
			/auth/i,
			/credential/i,
		];

		const dataString = JSON.stringify(exportData).toLowerCase();

		for (const pattern of sensitivePatterns) {
			if (pattern.test(dataString)) {
				result.warnings.push(`Potential sensitive data detected: ${pattern.source}`);
				result.recommendations.push('Review export data for sensitive information before sharing');
				result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
			}
		}
	}

	private validateCredentialSecurity(credentials: any[], result: SecurityValidationResult): void {
		if (!Array.isArray(credentials)) {
			return;
		}

		for (const credential of credentials) {
			// Check if credential data is encrypted
			if (credential.data && typeof credential.data === 'string') {
				result.recommendations.push(
					'Credential data appears to be encrypted, which is good practice',
				);
			} else if (credential.data && typeof credential.data === 'object') {
				result.warnings.push(`Credential "${credential.name}" may contain unencrypted data`);
				result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
			}
		}
	}

	private validateWorkflowSecurity(workflows: any[], result: SecurityValidationResult): void {
		if (!Array.isArray(workflows)) {
			return;
		}

		for (const workflow of workflows) {
			if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
				continue;
			}

			// Check for potentially dangerous nodes
			const dangerousNodeTypes = ['webhook', 'http-request', 'ssh', 'ftp', 'mysql', 'postgres'];

			for (const node of workflow.nodes) {
				if (dangerousNodeTypes.includes(node.type?.toLowerCase())) {
					result.warnings.push(
						`Workflow "${workflow.name}" contains potentially sensitive node type: ${node.type}`,
					);
					result.recommendations.push(
						'Review workflows with external connections before importing',
					);
					result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
				}

				// Check for hardcoded credentials or sensitive data in node parameters
				if (node.parameters) {
					const paramString = JSON.stringify(node.parameters).toLowerCase();
					if (
						paramString.includes('password') ||
						paramString.includes('secret') ||
						paramString.includes('token')
					) {
						result.warnings.push(
							`Workflow "${workflow.name}" may contain hardcoded sensitive data in node "${node.name}"`,
						);
						result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
					}
				}
			}
		}
	}
}
