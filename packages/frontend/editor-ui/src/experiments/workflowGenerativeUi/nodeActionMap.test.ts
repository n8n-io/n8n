import { hintCatalogType } from './nodeActionMap';

describe('hintCatalogType', () => {
	it('maps Slack message post to ChatMessage', () => {
		expect(
			hintCatalogType({
				type: 'n8n-nodes-base.slack',
				resource: 'message',
				operation: 'post',
			}),
		).toBe('ChatMessage');
	});

	it('maps HTTP Request to HttpCall', () => {
		expect(hintCatalogType({ type: 'n8n-nodes-base.httpRequest' })).toBe('HttpCall');
	});

	it('maps SSH command execute to Terminal', () => {
		expect(
			hintCatalogType({
				type: 'n8n-nodes-base.ssh',
				resource: 'command',
				operation: 'execute',
			}),
		).toBe('Terminal');
	});

	it('maps FTP upload to FileTransfer', () => {
		expect(
			hintCatalogType({
				type: 'n8n-nodes-base.ftp',
				operation: 'upload',
			}),
		).toBe('FileTransfer');
	});

	it('maps form trigger to Form', () => {
		expect(hintCatalogType({ type: 'n8n-nodes-base.formTrigger' })).toBe('Form');
	});

	it('maps schedule trigger to When', () => {
		expect(hintCatalogType({ type: 'n8n-nodes-base.scheduleTrigger' })).toBe('When');
	});

	it('returns null for unknown plumbing', () => {
		expect(hintCatalogType({ type: 'n8n-nodes-base.stickyNote' })).toBeNull();
	});
});
