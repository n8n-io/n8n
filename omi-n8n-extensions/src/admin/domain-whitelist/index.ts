/**
 * Domain Whitelist Management
 *
 * Controls which email domains are allowed to sign in via Google SSO.
 * Domain data is stored in OmiGroup's separate SQLite database.
 *
 * Supports both:
 * - Environment variable whitelist (OMI_DOMAIN_WHITELIST)
 * - Database-managed whitelist (admin can add/remove via API)
 */

import type { Express, Request, Response, NextFunction } from 'express';
import { getOmiDb } from '../../database';
import { getConfig } from '../../config';
import { verifyOmiAdmin, getOmiUser } from '../../middleware/auth-guard';

interface DomainEntry {
	id: number;
	domain: string;
	added_by: string | null;
	created_at: string;
}

/**
 * Check if an email address belongs to an allowed domain.
 *
 * Checks both env-based and database-based whitelist.
 * If whitelist enforcement is disabled, always returns true.
 */
export function isDomainAllowed(email: string): boolean {
	const config = getConfig();

	// If enforcement is disabled, allow all
	if (!config.domainWhitelist.enforced) return true;

	const domain = email.split('@')[1]?.toLowerCase();
	if (!domain) return false;

	// Check env-based whitelist
	if (config.domainWhitelist.domains.includes(domain)) return true;

	// Check database whitelist
	try {
		const db = getOmiDb();
		const row = db
			.prepare('SELECT id FROM omi_domain_whitelist WHERE domain = ?')
			.get(domain) as DomainEntry | undefined;
		return !!row;
	} catch {
		// If DB is not available, fall back to env-only
		return false;
	}
}

/**
 * Get all whitelisted domains (both env and database).
 */
export function getAllDomains(): Array<{ domain: string; source: 'env' | 'database'; addedBy?: string }> {
	const config = getConfig();
	const results: Array<{ domain: string; source: 'env' | 'database'; addedBy?: string }> = [];

	// Env-based domains
	for (const domain of config.domainWhitelist.domains) {
		results.push({ domain, source: 'env' });
	}

	// Database domains
	try {
		const db = getOmiDb();
		const rows = db
			.prepare('SELECT domain, added_by FROM omi_domain_whitelist ORDER BY domain')
			.all() as DomainEntry[];

		for (const row of rows) {
			// Avoid duplicates with env
			if (!config.domainWhitelist.domains.includes(row.domain)) {
				results.push({
					domain: row.domain,
					source: 'database',
					addedBy: row.added_by ?? undefined,
				});
			}
		}
	} catch {
		// DB not available
	}

	return results;
}

/**
 * Add a domain to the database whitelist.
 */
export function addDomain(domain: string, addedBy?: string): boolean {
	const normalizedDomain = domain.trim().toLowerCase();
	if (!normalizedDomain || !normalizedDomain.includes('.')) {
		return false;
	}

	try {
		const db = getOmiDb();
		db.prepare(
			'INSERT OR IGNORE INTO omi_domain_whitelist (domain, added_by) VALUES (?, ?)',
		).run(normalizedDomain, addedBy ?? null);
		return true;
	} catch (err) {
		console.error('[OmiGroup] Failed to add domain:', err);
		return false;
	}
}

/**
 * Remove a domain from the database whitelist.
 * Note: Cannot remove env-based domains (they must be removed from the env var).
 */
export function removeDomain(domain: string): boolean {
	try {
		const db = getOmiDb();
		const result = db
			.prepare('DELETE FROM omi_domain_whitelist WHERE domain = ?')
			.run(domain.trim().toLowerCase());
		return (result.changes ?? 0) > 0;
	} catch (err) {
		console.error('[OmiGroup] Failed to remove domain:', err);
		return false;
	}
}

/**
 * Mount domain whitelist admin routes.
 */
export function mountDomainWhitelistRoutes(app: Express): void {
	// GET /omi/admin/domains - List all whitelisted domains
	app.get('/omi/admin/domains', verifyOmiAdmin, (_req: Request, res: Response) => {
		const config = getConfig();
		res.json({
			enforced: config.domainWhitelist.enforced,
			domains: getAllDomains(),
		});
	});

	// POST /omi/admin/domains - Add a domain
	app.post('/omi/admin/domains', verifyOmiAdmin, (req: Request, res: Response) => {
		const { domain } = req.body as { domain?: string };
		if (!domain) {
			return res.status(400).json({ error: 'Domain is required' });
		}

		const success = addDomain(domain, getOmiUser(req)?.email);
		if (success) {
			res.json({ success: true, message: `Domain "${domain}" added to whitelist` });
		} else {
			res.status(400).json({ error: 'Failed to add domain. Check format.' });
		}
	});

	// DELETE /omi/admin/domains/:domain - Remove a domain
	app.delete('/omi/admin/domains/:domain', verifyOmiAdmin, (req: Request, res: Response) => {
		const { domain } = req.params;
		const config = getConfig();

		// Check if it's an env-based domain
		if (config.domainWhitelist.domains.includes(domain.toLowerCase())) {
			return res.status(400).json({
				error: 'Cannot remove env-based domain. Remove it from OMI_DOMAIN_WHITELIST env var.',
			});
		}

		const success = removeDomain(domain);
		if (success) {
			res.json({ success: true, message: `Domain "${domain}" removed from whitelist` });
		} else {
			res.status(404).json({ error: 'Domain not found in whitelist' });
		}
	});

	console.log('[OmiGroup] Domain whitelist routes mounted');
}
