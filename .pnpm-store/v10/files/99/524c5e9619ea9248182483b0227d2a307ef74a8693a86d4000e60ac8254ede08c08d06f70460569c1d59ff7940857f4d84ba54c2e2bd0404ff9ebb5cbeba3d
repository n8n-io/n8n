/**
Let a globally installed package use a locally installed version of itself if available.

@param filePath - The absolute file path to the main file of the package.

@example
```
import importLocal from 'import-local';

if (importLocal(import.meta.url)) {
	console.log('Using local version of this package');
} else {
	// Code for both global and local version here…
}
```
*/
export default function importLocal(filePath: string): boolean | undefined | unknown;
