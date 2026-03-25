import { ExplicitParams } from "./config-loader";
export interface RegisterParams extends ExplicitParams {
    /**
     * Defaults to `--project` CLI flag or `process.cwd()`
     */
    cwd?: string;
}
/**
 * Installs a custom module load function that can adhere to paths in tsconfig.
 * Returns a function to undo paths registration.
 */
export declare function register(params?: RegisterParams): () => void;
