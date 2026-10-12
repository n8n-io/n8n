import { joinWorkspacePath, normalizeWorkspaceRelativePath } from '../workspace-paths';

describe('normalizeWorkspaceRelativePath', () => {
	it('normalizes relative paths', () => {
		expect(normalizeWorkspaceRelativePath('src/workflows/main.workflow.ts')).toBe(
			'src/workflows/main.workflow.ts',
		);
		expect(normalizeWorkspaceRelativePath('./src//main.workflow.ts')).toBe('src/main.workflow.ts');
	});

	it.each(['../main.ts', '~/main.ts', '/etc/passwd', 'src\\main.ts', ''])(
		'rejects %j without a workspace root',
		(path) => {
			expect(() => normalizeWorkspaceRelativePath(path)).toThrow(
				'must stay within the workspace root',
			);
		},
	);

	describe('with workspaceRoot', () => {
		const workspaceRoot = '/home/user/workspace';

		it('strips the root prefix from absolute paths under the root', () => {
			expect(
				normalizeWorkspaceRelativePath('/home/user/workspace/src/main.workflow.ts', {
					workspaceRoot,
				}),
			).toBe('src/main.workflow.ts');
		});

		it('tolerates a trailing slash on the configured root', () => {
			expect(
				normalizeWorkspaceRelativePath('/home/user/workspace/src/main.workflow.ts', {
					workspaceRoot: '/home/user/workspace/',
				}),
			).toBe('src/main.workflow.ts');
		});

		it('collapses redundant slashes under the root', () => {
			expect(
				normalizeWorkspaceRelativePath('/home/user/workspace//src//main.workflow.ts', {
					workspaceRoot,
				}),
			).toBe('src/main.workflow.ts');
		});

		it('rejects absolute paths outside the root', () => {
			expect(() =>
				normalizeWorkspaceRelativePath('/tmp/main.workflow.ts', { workspaceRoot }),
			).toThrow('must stay within the workspace root');
		});

		it('rejects a sibling directory sharing the root as a string prefix', () => {
			expect(() =>
				normalizeWorkspaceRelativePath('/home/user/workspace-other/main.ts', { workspaceRoot }),
			).toThrow('must stay within the workspace root');
		});

		it('rejects the bare root (no file path)', () => {
			expect(() => normalizeWorkspaceRelativePath(workspaceRoot, { workspaceRoot })).toThrow(
				'must stay within the workspace root',
			);
		});

		it('still rejects traversal after stripping the root', () => {
			expect(() =>
				normalizeWorkspaceRelativePath('/home/user/workspace/../secrets.txt', { workspaceRoot }),
			).toThrow('must stay within the workspace root');
		});
	});
});

describe('joinWorkspacePath', () => {
	it('joins the root with a normalized relative path', () => {
		expect(joinWorkspacePath('/home/user/workspace', 'src/main.ts')).toBe(
			'/home/user/workspace/src/main.ts',
		);
	});
});
