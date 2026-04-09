---
title: "Jest: cannot find module '@ai-sdk/rsc'"
description: "Troubleshooting AI SDK errors related to the Jest: cannot find module '@ai-sdk/rsc' error"
---

# Jest: cannot find module '@ai-sdk/rsc'

## Issue

I am using AI SDK RSC and am writing tests for my RSC components with Jest.

I am getting the following error: `Cannot find module '@ai-sdk/rsc'`.

## Solution

Configure the module resolution via `jest config update` in `moduleNameMapper`:

```json filename="jest.config.js"
"moduleNameMapper": {
  "^@ai-sdk/rsc$": "<rootDir>/node_modules/@ai-sdk/rsc/dist"
}
```
