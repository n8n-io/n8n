import { readShownPageId } from '../shown-page';

const instance = { origin: 'https://n8n.example.com', basePath: '' };
const instanceBehindBasePath = { origin: 'https://n8n.example.com', basePath: '/n8n/' };

describe('readShownPageId', () => {
	it.each([
		'/page/p1',
		'  /page/p1\n',
		'/page/p1/',
		'/page/p1?tab=a#top',
		'/projects/proj1/pages/p1',
		'https://n8n.example.com/page/p1',
		'https://n8n.example.com/projects/proj1/pages/p1',
		'https://other.example.com/n8n/page/p1',
		'[Runbook](/page/p1)',
		'[Runbook](</page/p1>)',
		'[](/projects/proj1/pages/p1)',
		'[Runbook](https://n8n.example.com/page/p1)',
	])('should read the page id of %j', (content) => {
		expect(readShownPageId(content)).toBe('p1');
	});

	it.each([
		'',
		'   ',
		'p1',
		'See /page/p1',
		'/page/p1 is the runbook',
		'[Runbook](/page/p1) and more',
		'[Runbook](/page/p1) [Other](/page/p2)',
		'## Title\n\n/page/p1',
		'/workflow/wf1',
		'[Sync](/workflow/wf1)',
		'//other.example.com/page/p1',
		'https://n8n.example.com/workflow/wf1',
		'https://n8n.example.com/page/p1/extra',
		'not a url',
	])('should read no page id from %j', (content) => {
		expect(readShownPageId(content)).toBeUndefined();
	});

	it('should accept an absolute URL of the given instance', () => {
		expect(readShownPageId('https://n8n.example.com/page/p1', instance)).toBe('p1');
		expect(readShownPageId('[Runbook](https://n8n.example.com/page/p1)', instance)).toBe('p1');
	});

	it('should accept a relative path with a given instance', () => {
		expect(readShownPageId('/page/p1', instance)).toBe('p1');
	});

	it('should reject an absolute URL of another origin when an instance is given', () => {
		expect(readShownPageId('https://other.example.com/page/p1', instance)).toBeUndefined();
	});

	it('should remove the base path of the given instance', () => {
		expect(readShownPageId('https://n8n.example.com/n8n/page/p1', instanceBehindBasePath)).toBe(
			'p1',
		);
	});

	it('should reject an absolute URL outside the base path of the given instance', () => {
		expect(
			readShownPageId('https://n8n.example.com/page/p1', instanceBehindBasePath),
		).toBeUndefined();
		expect(readShownPageId('https://n8n.example.com/other/page/p1', instance)).toBeUndefined();
	});
});
