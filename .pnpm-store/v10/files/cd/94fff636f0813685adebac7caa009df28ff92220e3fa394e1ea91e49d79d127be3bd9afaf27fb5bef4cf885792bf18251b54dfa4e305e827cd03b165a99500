---
title: TypeScript performance issues with Zod and AI SDK 5
description: Troubleshooting TypeScript server crashes and slow performance when using Zod with AI SDK 5
---

# TypeScript performance issues with Zod and AI SDK 5

## Issue

When using the AI SDK 5 with Zod, you may experience:

- TypeScript server crashes or hangs
- Extremely slow type checking in files that import AI SDK functions
- Error messages like "Type instantiation is excessively deep and possibly infinite"
- IDE becoming unresponsive when working with AI SDK code

## Background

The AI SDK 5 has specific compatibility requirements with Zod versions. When importing Zod using the standard import path (`import { z } from 'zod'`), TypeScript's type inference can become excessively complex, leading to performance degradation or crashes.

## Solution

### Upgrade Zod to 4.1.8 or Later

The primary solution is to upgrade to Zod version 4.1.8 or later, which includes a fix for this module resolution issue:

```bash
pnpm add zod@^4.1.8
```

This version resolves the underlying problem where different module resolution settings were causing TypeScript to load the same Zod declarations twice, leading to expensive structural comparisons.

### Alternative: Update TypeScript Configuration

If upgrading Zod isn't possible, you can update your `tsconfig.json` to use `moduleResolution: "nodenext"`:

```json
{
  "compilerOptions": {
    "moduleResolution": "nodenext"
    // ... other options
  }
}
```

This resolves the TypeScript performance issues while allowing you to continue using the standard Zod import.
