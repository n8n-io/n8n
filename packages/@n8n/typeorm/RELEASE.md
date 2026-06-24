# Release

Temporary release process until we bring this fork into the `n8n-io/n8n` monorepo.

1. Merge PR to bump version in `package.json` (update suffix only)
2. Create dist: `npm run package`
3. Test publish: `cd ./build/package && npm publish --access public --dry-run` (requires publish permission)
4. Publish: `npm publish --access public`
5. Verify on npm: https://www.npmjs.com/package/@n8n/typeorm?activeTab=versions