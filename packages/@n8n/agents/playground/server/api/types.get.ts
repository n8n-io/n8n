import { getSdkTypeDeclarations, getZodTypeDeclarations } from '../utils/sdk-types';

/**
 * Serves the real type declarations for Monaco.
 * Types are read from actual built files so they always stay in sync.
 */
export default defineEventHandler(() => {
	return {
		declaration: getSdkTypeDeclarations(),
		zodDeclaration: getZodTypeDeclarations(),
	};
});
