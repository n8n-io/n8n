---
description: Workflows for n8n local development
---

# n8n Development Workflows

These workflows help you manage the n8n development environment.

## 🚀 Start Development Mode
// turbo
1. Runs n8n in development mode with hot reloading.
   ```bash
   pnpm dev
   ```

## 🏗️ Build All Packages
// turbo
1. Builds all packages in the monorepo.
   ```bash
   pnpm build > build.log 2>&1
   ```

## 🧪 Run Tests
// turbo
1. Runs all tests across the monorepo.
   ```bash
   pnpm test
   ```

## 🧹 Reset Environment
// turbo
1. Resets the environment (clean install, build, etc).
   ```bash
   pnpm reset
   ```

## 📦 Build for Production
// turbo
1. Builds the production-ready n8n package.
   ```bash
   pnpm build:deploy
   ```
