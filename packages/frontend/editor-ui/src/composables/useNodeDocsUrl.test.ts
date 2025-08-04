import { NPM_PACKAGE_DOCS_BASE_URL } from '../constants';
import { useNodeDocsUrl } from './useNodeDocsUrl';

import type { INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

describe('useNodeDocsUrl', () => {
	it('returns full documentationUrl if set', () => {
		const nodeType = mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.set',
			documentationUrl: 'https://example.com/docs',
		});
		const { docsUrl } = useNodeDocsUrl({ nodeType });
		expect(docsUrl.value).toBe('https://example.com/docs');
	});

	it('returns codex primaryDocumentation url with UTM params', () => {
		const nodeType = mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.set',
			documentationUrl: '',
			codex: {
				resources: {
					primaryDocumentation: [{ url: 'https://docs.n8n.io/nodes/MyNode' }],
				},
			},
		});

		const { docsUrl } = useNodeDocsUrl({ nodeType });

		expect(docsUrl.value).toEqual(
			'https://docs.n8n.io/nodes/MyNode?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.set',
		);
	});

	it('returns community docs url for community-nodes', () => {
		const nodeType = mock<INodeTypeDescription>({
			name: 'n8n-nodes-custom.custom',
			documentationUrl: '',
		});
		const { docsUrl } = useNodeDocsUrl({ nodeType });

		expect(docsUrl.value).toBe(`${NPM_PACKAGE_DOCS_BASE_URL}n8n-nodes-custom`);
	});

	it('returns builtin docs root with UTM if no other match', () => {
		const nodeType = mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.set',
			documentationUrl: '',
		});
		const { docsUrl } = useNodeDocsUrl({ nodeType });

		expect(docsUrl.value).toEqual(
			'https://docs.n8n.io/integrations/builtin/?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.set',
		);
	});

	it('returns empty string if documentationUrl is null', () => {
		const nodeType = null;
		const { docsUrl } = useNodeDocsUrl({ nodeType });

		expect(docsUrl.value).toBe('');
	});
});
