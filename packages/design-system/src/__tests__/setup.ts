import '@testing-library/jest-dom';
import { config } from '@vue/test-utils';
import { N8nPlugin } from '@/plugin';

config.global.plugins = [N8nPlugin];
