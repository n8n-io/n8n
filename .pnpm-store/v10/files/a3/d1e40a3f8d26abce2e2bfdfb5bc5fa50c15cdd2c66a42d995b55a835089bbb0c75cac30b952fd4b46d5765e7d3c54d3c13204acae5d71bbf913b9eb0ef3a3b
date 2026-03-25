/**
Check if the current environment is Windows Subsystem for Linux (WSL).
*/
export const isWsl: boolean;

/**
Get the PowerShell executable path in WSL environment.
*/
export function powerShellPathFromWsl(): Promise<string>;

/**
Get the PowerShell executable path for the current environment.

Returns WSL path if in WSL, otherwise returns Windows path.
*/
export function powerShellPath(): Promise<string>;

/**
Get the mount point for fixed drives in WSL.
*/
export function wslDrivesMountPoint(): Promise<string>;
