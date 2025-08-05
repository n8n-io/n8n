# ignore-patterns

This fixture tests the `.claude-hooks-ignore` functionality for excluding certain files and directories from testing.

## Contents
- `.claude-hooks-ignore`: Defines patterns to ignore
- `Tiltfile` & `Tiltfile_test.py`: Main files that should be tested
- `vendor/Tiltfile`: Should be ignored (vendor directory)
- `node_modules/Tiltfile`: Should be ignored (node_modules directory)
- `build/.tilt/Tiltfile`: Should be ignored (build directory)
- `Tiltfile.backup`: Should be ignored (*.backup pattern)
- `temp_Tiltfile`: Should be ignored (temp_* pattern)

## Ignore Patterns
The `.claude-hooks-ignore` file contains:
- `vendor/` - Third-party code
- `node_modules/` - Node.js dependencies
- `build/` - Build artifacts
- `*.backup` - Backup files
- `*.tmp` - Temporary files
- `temp_*` - Temporary files with prefix

## Expected Behavior
The test-tilt hook should:
1. Read and respect `.claude-hooks-ignore` patterns
2. Only test the main `Tiltfile` and skip all ignored patterns
3. Not descend into ignored directories
4. Not test files matching ignore patterns