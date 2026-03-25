# wsl-utils

> Utilities for working with [Windows Subsystem for Linux (WSL)](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux)

## Install

```sh
npm install wsl-utils
```

## Usage

```js
import {isWsl, powerShellPathFromWsl} from 'wsl-utils';

// Check if running in WSL
console.log('Is WSL:', isWsl);

// Get PowerShell path from WSL
console.log('PowerShell path:', await powerShellPathFromWsl());
//=> '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
```

## API

### isWsl

Type: `boolean`

Check if the current environment is Windows Subsystem for Linux (WSL).

### powerShellPathFromWsl()

Returns: `Promise<string>`

Get the PowerShell executable path in WSL environment.

### powerShellPath()

Returns: `Promise<string>`

Get the PowerShell executable path for the current environment.

Returns WSL path if in WSL, otherwise returns Windows path.

### wslDrivesMountPoint()

Returns: `Promise<string>`

Get the mount point for fixed drives in WSL.
