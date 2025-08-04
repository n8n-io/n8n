import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';

configure({ testIdAttribute: 'data-test-id' });
