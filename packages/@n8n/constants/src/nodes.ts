/**
 * Packages whose node type definitions are generated to disk at build time.
 * These names are also reserved and cannot be installed as community packages.
 */
export const BUILTIN_NODES_PACKAGES = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'] as const;
