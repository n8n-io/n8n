import { ESLintUtils } from '@typescript-eslint/utils';

const REPO_URL = 'https://github.com/n8n-io/n8n';
const DOCS_PATH = 'blob/master/packages/@n8n/eslint-plugin-community-nodes/docs/rules';

export const createRule = ESLintUtils.RuleCreator((name) => `${REPO_URL}/${DOCS_PATH}/${name}.md`);
