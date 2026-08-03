import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/vue';

configure({ testIdAttribute: 'data-test-id' });
