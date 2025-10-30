import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';

// Avoid tests failing because of difference between local and GitHub actions timezone
process.env.TZ = 'UTC';

configure({ testIdAttribute: 'data-test-id' });
