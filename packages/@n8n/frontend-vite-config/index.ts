export {
	frontendAliases,
	shellAliases,
	transitiveWorkspaceAliases,
	vendorAliases,
} from './aliases.ts';

export {
	frontendModuleAliases,
	frontendSourceAliases,
	// The tables themselves, for the guard test that checks them against tsconfig `paths`.
	modulePackages,
	sourcePackages,
} from './source-packages.ts';
