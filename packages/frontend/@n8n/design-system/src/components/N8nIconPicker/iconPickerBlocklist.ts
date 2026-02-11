/**
 * Icons that are excluded from the project icon picker because they are
 * already used in n8n's navigation, settings, or environment UI.
 * Selecting these as project icons would create visual confusion between
 * projects and core application functions.
 *
 * To update: search the codebase for icon usage in sidebar, header,
 * settings, and environment components.
 *
 * Last audited: 2026-02-11
 */
export const ICON_PICKER_BLOCKLIST: ReadonlySet<string> = new Set([
	// --- Sidebar / Main Navigation ---
	'house', // Home / Overview page
	'search', // Global search / Command palette (Cmd+K)
	'plus', // Create new workflow / credential button
	'panel-left', // Sidebar expand / collapse toggle
	'lock', // Read-only environment indicator
	'share', // "Shared with me" section
	'user', // Personal project link
	'message-circle', // Chat hub navigation link
	'cloud', // Cloud admin panel link
	'lightbulb', // Resource center
	'package-open', // Templates link
	'chart-column-decreasing', // Insights analytics page
	'circle-help', // Help menu
	'video', // Help > Quickstart video
	'book', // Help > Documentation link
	'users', // Help > Community forum link
	'graduation-cap', // Help > Courses link
	'bug', // Help > Report bug link
	'info', // About n8n dialog
	'settings', // Settings entry point (gear icon)
	'door-open', // Sign out / Logout
	'external-link', // Full changelog link
	'ellipsis', // User menu trigger (three dots)
	'layers', // Default team project icon fallback

	// --- Chat Sidebar ---
	'message-square', // Chat > Personal agents link
	'bot', // Chat > Workflow agents link

	// --- Settings UI (section icons) ---
	'arrow-left', // Settings sidebar back / return button
	'circle-user-round', // Personal settings section
	'user-round', // Users management / Project roles section
	'sparkles', // AI settings section
	'plug', // API settings section
	'vault', // External secrets section
	'key-round', // Credential resolvers section
	'user-lock', // SSO settings section
	'shield', // Security settings section
	'network', // LDAP settings section
	'waypoints', // Workers view section
	'log-in', // Log streaming section
	'box', // Community nodes section
	'list-checks', // Migration report section
	'mcp', // MCP Server settings section

	// --- Source Control / Environment ---
	'git-branch', // Branch / environment indicator
	'arrow-down', // Pull from remote button
	'arrow-up', // Push to remote button
]);
