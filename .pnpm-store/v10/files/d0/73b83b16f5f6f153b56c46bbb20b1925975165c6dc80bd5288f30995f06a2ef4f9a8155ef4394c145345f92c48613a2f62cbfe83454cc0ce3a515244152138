import * as ts from 'typescript';
import type { ASTAndDefiniteProgram } from './shared';
export interface ProvidedProgramsSettings {
    filePath: string;
    tsconfigRootDir: string;
}
declare function useProvidedPrograms(programInstances: Iterable<ts.Program>, { filePath, tsconfigRootDir }: ProvidedProgramsSettings): ASTAndDefiniteProgram | undefined;
/**
 * Utility offered by parser to help consumers construct their own program instance.
 *
 * @param configFile the path to the tsconfig.json file, relative to `projectDirectory`
 * @param projectDirectory the project directory to use as the CWD, defaults to `process.cwd()`
 */
declare function createProgramFromConfigFile(configFile: string, projectDirectory?: string): ts.Program;
export { useProvidedPrograms, createProgramFromConfigFile };
//# sourceMappingURL=useProvidedPrograms.d.ts.map