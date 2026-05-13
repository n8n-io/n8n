/**
 * Jest globalSetup hook: extract committed zips into the expected on-disk
 * layout before any test runs. We can't rely on npm/pnpm's pretest hook here
 * because CI invokes `test:unit` (turbo task), not `test`.
 */
import { extractAllWorkflows } from './extract-workflows';

module.exports = () => {
	extractAllWorkflows();
};
