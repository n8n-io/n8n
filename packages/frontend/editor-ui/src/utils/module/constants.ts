/**
 * Utility to generate standardized module constants
 * Reduces boilerplate and ensures consistent naming conventions
 */

export interface ModuleConstants {
	VIEW: string;
	PROJECT_VIEW: string;
	DETAILS: string;
	[key: string]: string;
}

/**
 * Generate standardized constants for a module
 *
 * @param moduleName - The module name (e.g., 'dataStore', 'insights')
 * @param customConstants - Additional custom constants specific to the module
 * @returns Object with standardized constant names
 */
export function createModuleConstants(
	moduleName: string,
	customConstants: Record<string, string> = {},
): ModuleConstants {
	const kebabCase = moduleName.replace(/([A-Z])/g, '-$1').toLowerCase();

	const standardConstants = {
		VIEW: `${kebabCase}-view`,
		PROJECT_VIEW: `project-${kebabCase}`,
		DETAILS: `${kebabCase}-details`,
	};

	return {
		...standardConstants,
		...customConstants,
	};
}

/**
 * Generate route names with consistent patterns
 */
export function createRouteNames(moduleName: string) {
	return createModuleConstants(moduleName, {
		LIST: `${moduleName}-list`,
		CREATE: `${moduleName}-create`,
		EDIT: `${moduleName}-edit`,
	});
}
