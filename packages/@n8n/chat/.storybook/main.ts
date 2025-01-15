import { sharedConfig } from '@n8n/storybook/main';

const config = { ...sharedConfig, staticDirs: ['../dist'] };
export default config;
