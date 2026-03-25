import { Logger } from "../../../common";
export type ComposeOptions = {
    filePath: string;
    files: string | string[];
    projectName: string;
    commandOptions?: string[];
    composeOptions?: string[];
    environment?: NodeJS.ProcessEnv;
    logger?: Logger;
    executable?: ComposeExecutableOptions;
};
export type ComposeExecutableOptions = {
    executablePath: string;
    options?: string[] | (string | string[])[];
    standalone?: never;
} | {
    executablePath?: string;
    options?: never;
    standalone: true;
};
export type ComposeDownOptions = {
    timeout: number;
    removeVolumes: boolean;
};
