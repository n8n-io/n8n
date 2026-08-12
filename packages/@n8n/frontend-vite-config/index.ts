export {
	frontendAliases,
	shellAliases,
	transitiveWorkspaceAliases,
	vendorAliases,
} from './aliases.js';

export {
	frontendModuleAliases,
	frontendSourceAliases,
	// The tables themselves, for the guard test that checks them against tsconfig `paths`.
	modulePackages,
	sourcePackages,
} from './source-packages.js';
