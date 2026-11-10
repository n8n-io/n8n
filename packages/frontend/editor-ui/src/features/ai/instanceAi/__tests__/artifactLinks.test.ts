import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { useArtifactLinks } from '../artifactLinks';
import { createArtifactTestRouter } from './artifactTestRouter';

function setup(base: string) {
	let links!: ReturnType<typeof useArtifactLinks>;
	mount(
		defineComponent({
			setup() {
				links = useArtifactLinks();
				return () => null;
			},
		}),
		{ global: { plugins: [createArtifactTestRouter(base)] } },
	);
	return links;
}

const BASES = [
	{ base: '/', prefix: '' },
	{ base: '/n8n/', prefix: '/n8n' },
	{ base: '/nested/n8n/', prefix: '/nested/n8n' },
];

describe('useArtifactLinks', () => {
	it.each([
		['credential', '/n8n/home/credentials/res-1'],
		['data-table', '/n8n/home/datatables'],
		['agent', '/n8n/home/agents'],
	] as const)('resolves a %s without a project to %s', (type, href) => {
		const { artifactHref } = setup('/n8n/');

		expect(artifactHref(type, 'res-1')).toBe(href);
	});

	it('has no link for an app without a project', () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const { artifactHref, artifactUrl, openArtifactInNewTab } = setup('/n8n/');

		expect(artifactHref('app', 'app-1')).toBeUndefined();
		expect(artifactUrl('app', 'app-1')).toBeUndefined();
		expect(openArtifactInNewTab('app', 'app-1')).toBe(false);
		expect(open).not.toHaveBeenCalled();
	});

	it('encodes ids in paths and queries', () => {
		const { artifactHref } = setup('/n8n/');
		const id = 'id /+#?%č&';

		const workflowUrl = new URL(artifactHref('workflow', id) ?? '', window.location.origin);
		expect(decodeURIComponent(workflowUrl.pathname)).toBe(`/n8n/workflow/${id}`);

		const skillUrl = new URL(artifactHref('skill', id) ?? '', window.location.origin);
		expect(skillUrl.pathname).toBe('/n8n/settings/context/skills');
		expect(skillUrl.searchParams.get('skillId')).toBe(id);
		expect(skillUrl.hash).toBe('');
	});

	it.each(BASES)(
		'keeps the history base $base in hrefs, copied URLs and new tabs',
		({ base, prefix }) => {
			const open = vi.spyOn(window, 'open').mockReturnValue(null);
			const { artifactHref, artifactUrl, openArtifactInNewTab } = setup(base);

			expect(artifactHref('workflow', 'wf-1')).toBe(`${prefix}/workflow/wf-1`);
			expect(artifactUrl('skill', 'skill-1')).toBe(
				`${window.location.origin}${prefix}/settings/context/skills?skillId=skill-1`,
			);
			expect(openArtifactInNewTab('agent', 'agent-1', 'project-1')).toBe(true);
			expect(open).toHaveBeenCalledWith(
				`${prefix}/projects/project-1/agents/agent-1`,
				'_blank',
				'noopener',
			);
		},
	);
});

describe('toRouterPath and routerPathHref', () => {
	it.each(BASES)(
		'read links with or without the history base $base and add the base once',
		({ base, prefix }) => {
			const { toRouterPath, routerPathHref } = setup(base);
			const pathname = '/workflow/wf-1';
			const fullPath = `${pathname}?a=b%20c&d=e+f#node`;

			for (const href of [
				fullPath,
				`${prefix}${fullPath}`,
				`${window.location.origin}${prefix}${fullPath}`,
			]) {
				expect(toRouterPath(href)).toEqual({ pathname, fullPath });
				expect(routerPathHref(fullPath)).toBe(`${prefix}${fullPath}`);
			}
		},
	);

	it('ignores relative and cross-origin links', () => {
		const { toRouterPath } = setup('/n8n/');

		expect(toRouterPath('workflow/wf-1')).toBeUndefined();
		expect(toRouterPath('//other.test/workflow/wf-1')).toBeUndefined();
		expect(toRouterPath('https://other.test/workflow/wf-1')).toBeUndefined();
	});

	it('removes only a whole-segment base', () => {
		const { toRouterPath } = setup('/n8n/');

		expect(toRouterPath('/n8n/workflow/wf-1')?.pathname).toBe('/workflow/wf-1');
		expect(toRouterPath('/n8n')?.pathname).toBe('/');
		expect(toRouterPath('/n8nx/workflow/wf-1')?.pathname).toBe('/n8nx/workflow/wf-1');
	});
});
