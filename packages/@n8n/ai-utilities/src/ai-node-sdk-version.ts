// Controls which SDK version is supported by the current n8n
// Check README.md for explanation
// NOTE: also inlined in packages/cli/src/modules/community-packages/community-packages.config.ts
// to avoid loading the @n8n/ai-utilities barrel at boot. Keep both values in sync.
export const AI_NODE_SDK_VERSION: number = 1;
