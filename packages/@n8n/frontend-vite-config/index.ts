// Self-referenced rather than relative: these files land in a consumer's tsconfig program (module
// packages typecheck their `vite.config.ts`), where a `./x.ts` specifier is TS5097 and a `./x` one
// does not resolve in Node's ESM loader, which reads this file directly when vite loads a config.
export {
	frontendAliases,
	shellAliases,
	transitiveWorkspaceAliases,
	vendorAliases,
} from '@n8n/frontend-vite-config/aliases';

export {
	frontendModuleAliases,
	frontendSourceAliases,
	// The tables themselves, for the guard test that checks them against tsconfig `paths`.
	modulePackages,
	sourcePackages,
} from '@n8n/frontend-vite-config/source-packages';
