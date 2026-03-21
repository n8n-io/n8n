// Plain CJS file — import() here stays as a real ESM dynamic import
// because TypeScript does not compile .js files (allowJs is off).
// This avoids tsc rewriting it to require(), which breaks ESM-only packages.
module.exports.loadSecureExec = () => import('secure-exec');
