/**
 * @omi/n8n-extensions
 *
 * OmiGroup extensions for n8n self-hosted.
 * Loaded via EXTERNAL_HOOK_FILES environment variable.
 *
 * This package does NOT modify any n8n core code.
 * All functionality is injected through n8n's external hooks system.
 *
 * Entry point: dist/hooks/omi-hooks.js
 */

// Config
export { loadConfig, getConfig } from './config';
export type { OmiConfig } from './config';

// Database
export { initOmiDb, getOmiDb, closeOmiDb } from './database';

// Auth
export { mountGoogleSsoRoutes } from './auth/google-oidc';
export { initAuthGuard, verifyAuthenticated, verifyOmiAdmin } from './middleware/auth-guard';
export type { OmiRequestUser } from './middleware/auth-guard';

// Admin
export { isDomainAllowed, getAllDomains, addDomain, removeDomain } from './admin/domain-whitelist';
export { recordExecution } from './admin/usage-stats';

// Departments
export { getAllDepartments, getDepartmentById, createDepartment } from './departments';

// Templates
export { mountTemplateRoutes } from './templates';

// Utilities
export { createN8nCompatibleJwt, verifyJwt, createJwtHash } from './utils/jwt';
export { generateUserId, generateSsoPasswordHash } from './utils/n8n-db';
export type { N8nUser, HookDbCollections } from './utils/n8n-db';
