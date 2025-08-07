'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.MigrationSecurityService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const crypto_1 = require('crypto');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
let MigrationSecurityService = class MigrationSecurityService {
	constructor(logger) {
		this.logger = logger;
		this.algorithm = 'aes-256-gcm';
		this.keyLength = 32;
		this.ivLength = 16;
		this.saltLength = 32;
		this.tagLength = 16;
	}
	async validateMigrationPermissions(user, operation) {
		this.logger.debug('Validating migration permissions', {
			userId: user.id,
			operation,
			userRole: user.role,
		});
		if (!user.role || !['global:owner', 'global:admin'].includes(user.role)) {
			throw new forbidden_error_1.ForbiddenError(
				'Insufficient permissions for migration operations',
			);
		}
		if (operation === 'transfer' && user.role !== 'global:owner') {
			throw new forbidden_error_1.ForbiddenError(
				'Only instance owners can perform cross-instance transfers',
			);
		}
		this.logger.debug('Migration permissions validated successfully', {
			userId: user.id,
			operation,
		});
	}
	async validateExportData(exportData, options = {}) {
		const result = {
			isValid: true,
			errors: [],
			warnings: [],
			recommendations: [],
			riskLevel: 'low',
		};
		try {
			if (!exportData || typeof exportData !== 'object') {
				result.errors.push('Invalid export data structure');
				result.isValid = false;
				result.riskLevel = 'critical';
				return result;
			}
			if (!exportData.metadata) {
				result.errors.push('Missing export metadata');
				result.isValid = false;
				result.riskLevel = 'high';
			}
			if (exportData.metadata) {
				const metadata = exportData.metadata;
				if (!metadata.id || !metadata.version || !metadata.createdAt) {
					result.errors.push('Invalid metadata structure');
					result.isValid = false;
					result.riskLevel = 'high';
				}
				if (metadata.createdAt) {
					const exportAge = Date.now() - new Date(metadata.createdAt).getTime();
					const maxAge = 7 * 24 * 60 * 60 * 1000;
					if (exportAge > maxAge) {
						result.warnings.push('Export data is older than 7 days');
						result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
					}
				}
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
			if (options.checkForSensitiveData) {
				this.checkForSensitiveData(exportData, result);
			}
			if (options.validateCredentials && exportData.credentials) {
				this.validateCredentialSecurity(exportData.credentials, result);
			}
			if (exportData.workflows) {
				this.validateWorkflowSecurity(exportData.workflows, result);
			}
			const dataSize = JSON.stringify(exportData).length;
			const maxSize = 100 * 1024 * 1024;
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
	async validateTargetInstanceSecurity(targetUrl, credentials) {
		const result = {
			isValid: true,
			errors: [],
			warnings: [],
			recommendations: [],
			riskLevel: 'low',
		};
		try {
			const url = new URL(targetUrl);
			if (url.protocol !== 'https:') {
				result.warnings.push('Target instance is not using HTTPS');
				result.recommendations.push('Use HTTPS for secure data transfer');
				result.riskLevel = 'medium';
			}
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
			if (
				!credentials.apiKey &&
				!credentials.authToken &&
				!(credentials.username && credentials.password)
			) {
				result.errors.push('No valid authentication method provided');
				result.isValid = false;
				result.riskLevel = 'critical';
			}
			if (credentials.password && credentials.password.length < 8) {
				result.warnings.push('Target instance password appears to be weak');
				result.recommendations.push('Use strong passwords for better security');
			}
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
	async encryptSensitiveData(data, password) {
		try {
			const salt = (0, crypto_1.randomBytes)(this.saltLength);
			const iv = (0, crypto_1.randomBytes)(this.ivLength);
			const key = await this.deriveKey(password, salt);
			const cipher = (0, crypto_1.createCipheriv)(this.algorithm, key, iv);
			let encrypted = cipher.update(data, 'utf8', 'hex');
			encrypted += cipher.final('hex');
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
			throw new internal_server_error_1.InternalServerError('Failed to encrypt sensitive data');
		}
	}
	async decryptSensitiveData(params) {
		try {
			const salt = Buffer.from(params.salt, 'hex');
			const iv = Buffer.from(params.iv, 'hex');
			const tag = Buffer.from(params.tag, 'hex');
			const key = await this.deriveKey(params.key, salt);
			const decipher = (0, crypto_1.createDecipheriv)(this.algorithm, key, iv);
			decipher.setAuthTag(tag);
			let decrypted = decipher.update(params.encryptedData, 'hex', 'utf8');
			decrypted += decipher.final('utf8');
			return decrypted;
		} catch (error) {
			this.logger.error('Failed to decrypt sensitive data', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new bad_request_error_1.BadRequestError(
				'Failed to decrypt data - invalid key or corrupted data',
			);
		}
	}
	generateSecureToken(length = 32) {
		return (0, crypto_1.randomBytes)(length).toString('hex');
	}
	validateMigrationToken(token, expectedLength = 64) {
		if (!token || typeof token !== 'string') {
			return false;
		}
		if (token.length !== expectedLength) {
			return false;
		}
		return /^[0-9a-f]+$/i.test(token);
	}
	createDataHash(data) {
		const dataString = JSON.stringify(data, Object.keys(data).sort());
		return (0, crypto_1.createHash)('sha256').update(dataString).digest('hex');
	}
	verifyDataIntegrity(data, expectedHash) {
		const actualHash = this.createDataHash(data);
		return actualHash === expectedHash;
	}
	async deriveKey(password, salt) {
		return new Promise((resolve, reject) => {
			const crypto = require('crypto');
			crypto.pbkdf2(password, salt, 100000, this.keyLength, 'sha256', (err, derivedKey) => {
				if (err) reject(err);
				else resolve(derivedKey);
			});
		});
	}
	checkForSensitiveData(exportData, result) {
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
	validateCredentialSecurity(credentials, result) {
		if (!Array.isArray(credentials)) {
			return;
		}
		for (const credential of credentials) {
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
	validateWorkflowSecurity(workflows, result) {
		if (!Array.isArray(workflows)) {
			return;
		}
		for (const workflow of workflows) {
			if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
				continue;
			}
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
};
exports.MigrationSecurityService = MigrationSecurityService;
exports.MigrationSecurityService = MigrationSecurityService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	MigrationSecurityService,
);
//# sourceMappingURL=migration-security.service.js.map
