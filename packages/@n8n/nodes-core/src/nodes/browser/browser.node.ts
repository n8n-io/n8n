import { defineNode } from '@n8n/node-sdk';

/** Renders pages with headless Chromium. It runs only in the container runtime. */
export const browser = defineNode({ id: 'browser', displayName: 'Browser' });
