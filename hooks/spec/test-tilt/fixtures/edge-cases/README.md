# edge-cases

This fixture tests various edge cases including Unicode characters, spaces in paths, special characters, and other challenging scenarios.

## Contents

### Files in Root
- `Tiltfile`: Contains Unicode, emoji, special characters
- `Tiltfile_test.py`: Comprehensive edge case tests
- `测试文件_test.py`: Test file with Chinese characters in name
- `test-file-with-dashes.py`: Test file with dashes (non-standard)

### Directory with Spaces
- `directory with spaces/Tiltfile`: Tiltfile in directory with spaces
- `directory with spaces/test_spaces.py`: Tests for space handling
- `directory with spaces/nested folder/`: Deeply nested path with spaces

## Edge Cases Tested

### Unicode and International Characters
- Chinese characters: 测试, 你好世界
- Accented characters: émojis, spëcial
- Emoji: 🚀 🎯 🎉
- Mixed scripts in single strings

### Path and Filename Issues
- Directories with spaces
- Files with spaces
- Files with parentheses: `config (production).json`
- Files with emoji: `deployment-🚀.yaml`
- Very long paths
- Quoted paths

### Special Characters
- Shell special characters: `$ \` ~ ! @ # % ^ & * ( )`
- Quotes in strings: single, double, nested, backticks
- Multiline commands with backslashes
- Environment variables with special values

### Python-specific Edge Cases
- Non-ASCII identifiers (测试类)
- Files with dashes (non-importable)
- Unicode in docstrings and comments
- Mixed encoding scenarios

## Expected Behavior
The test-tilt hook should:
1. Handle all Unicode characters correctly (UTF-8)
2. Properly quote paths with spaces
3. Execute tests in directories with spaces
4. Find test files with Unicode names
5. Handle special shell characters in commands
6. Work with very long paths and strings
7. Process multiline commands correctly
8. Not crash on any edge case

## Known Challenges
- Some shells may have issues with Unicode filenames
- Path length limits vary by OS
- Shell escaping rules are complex
- Python import system doesn't like dashes in filenames