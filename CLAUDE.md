# n8n Development Guide

## Build Commands
- Build all: `pnpm build`
- Build backend: `pnpm build:backend`
- Build frontend: `pnpm build:frontend`
- Start dev server: `pnpm dev`
- Run typecheck: `pnpm typecheck`

## Test Commands
- Run all tests: `pnpm test`
- Run single test file: `cd packages/cli && pnpm test -- -t "test description" path/to/file.test.ts`
- Watch tests: `cd packages/cli && pnpm test:dev`

## Lint/Format Commands
- Lint all: `pnpm lint`
- Format code: `pnpm format`
- Check formatting: `pnpm format:check`

## Code Style Guidelines
- TypeScript strict mode enabled
- Use single quotes for strings
- Tab indentation (2 spaces wide)
- Line width: 100 characters
- Trailing commas: always
- Semicolons: always
- Arrow function parentheses: always
- Organize imports automatically
- Use typed parameters and return types
- Naming: camelCase for variables/properties, PascalCase for classes/interfaces
- Error handling: use try/catch blocks and proper error propagation

## Git Workflow
- Format code automatically via pre-commit hooks (biome for JS/TS, prettier for Vue/CSS/etc)
- Full test suite runs on CI for all PRs