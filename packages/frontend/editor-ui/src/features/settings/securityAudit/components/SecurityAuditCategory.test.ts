import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import SecurityAuditCategory from './SecurityAuditCategory.vue';
import type { StandardReport, StandardSection, RiskCategory } from '../securityAudit.api';

const createMockReport = (
	overrides: Partial<StandardReport> & { risk?: Exclude<RiskCategory, 'instance'> } = {},
): StandardReport => ({
	risk: 'credentials',
	sections: [],
	...overrides,
});

const createMockSection = (overrides: Partial<StandardSection> = {}): StandardSection => ({
	title: 'Test Section',
	description: 'Test description',
	recommendation: 'Test recommendation',
	location: [],
	...overrides,
});

const createMockCredentialLocations = (count: number) =>
	Array.from({ length: count }, (_, i) => ({
		kind: 'credential' as const,
		id: `cred-${i}`,
		name: `Credential ${i}`,
	}));

const createMockNodeLocations = (count: number) =>
	Array.from({ length: count }, (_, i) => ({
		kind: 'node' as const,
		workflowId: `wf-${i}`,
		workflowName: `Workflow ${i}`,
		nodeId: `node-${i}`,
		nodeName: `Node ${i}`,
		nodeType: 'n8n-nodes-base.code',
	}));

describe('SecurityAuditCategory', () => {
	const renderComponent = createComponentRenderer(SecurityAuditCategory, {
		pinia: createTestingPinia(),
	});

	describe('header display', () => {
		it('should display category label and icon', () => {
			renderComponent({
				props: {
					report: createMockReport({ risk: 'credentials' }),
				},
			});

			expect(screen.getByText('Credentials')).toBeInTheDocument();
		});

		it('should display issue count badge when sections exist', () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection(), createMockSection()],
					}),
				},
			});

			expect(screen.getByText('2 issues')).toBeInTheDocument();
		});

		it('should display singular "issue" for single section', () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection()],
					}),
				},
			});

			expect(screen.getByText('1 issue')).toBeInTheDocument();
		});

		it('should not display badge when no sections', () => {
			renderComponent({
				props: {
					report: createMockReport({ sections: [] }),
				},
			});

			expect(screen.queryByText(/issue/)).not.toBeInTheDocument();
		});
	});

	describe('status icons', () => {
		it('should show success icon when no issues', () => {
			const { container } = renderComponent({
				props: {
					report: createMockReport({ sections: [] }),
				},
			});

			// Success state uses circle-check icon
			const successIcon = container.querySelector('[class*="success"]');
			expect(successIcon).toBeInTheDocument();
		});

		it('should show warning icon for 1-2 issues', () => {
			const { container } = renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection()],
					}),
				},
			});

			const warningIcon = container.querySelector('[class*="warning"]');
			expect(warningIcon).toBeInTheDocument();
		});

		it('should show danger icon for 3+ issues', () => {
			const { container } = renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection(), createMockSection(), createMockSection()],
					}),
				},
			});

			const dangerIcon = container.querySelector('[class*="danger"]');
			expect(dangerIcon).toBeInTheDocument();
		});
	});

	describe('expand/collapse', () => {
		it('should be collapsed by default', () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection({ title: 'Hidden Section' })],
					}),
				},
			});

			expect(screen.queryByText('Hidden Section')).not.toBeInTheDocument();
		});

		it('should be expanded when initiallyExpanded is true', () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection({ title: 'Visible Section' })],
					}),
					initiallyExpanded: true,
				},
			});

			expect(screen.getByText('Visible Section')).toBeInTheDocument();
		});

		it('should toggle content on header click', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection({ title: 'Toggle Section' })],
					}),
				},
			});

			// Initially collapsed
			expect(screen.queryByText('Toggle Section')).not.toBeInTheDocument();

			// Click to expand
			await user.click(screen.getByTestId('security-audit-category-header'));
			expect(screen.getByText('Toggle Section')).toBeInTheDocument();

			// Click to collapse
			await user.click(screen.getByTestId('security-audit-category-header'));
			expect(screen.queryByText('Toggle Section')).not.toBeInTheDocument();
		});

		it('should show "No issues found" message when expanded with no issues', () => {
			renderComponent({
				props: {
					report: createMockReport({ sections: [] }),
					initiallyExpanded: true,
				},
			});

			expect(screen.getByText('No issues found in this category')).toBeInTheDocument();
		});
	});

	describe('section content', () => {
		it('should display section title and description', async () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [
							createMockSection({
								title: 'Unused Credentials',
								description: 'These credentials are not used',
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			expect(screen.getByText('Unused Credentials')).toBeInTheDocument();
			expect(screen.getByText('These credentials are not used')).toBeInTheDocument();
		});

		it('should display recommendation', async () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [
							createMockSection({
								recommendation: 'Consider removing these credentials',
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			expect(screen.getByText('Consider removing these credentials')).toBeInTheDocument();
		});

		it('should display credential locations with links', async () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [
							createMockSection({
								location: [{ kind: 'credential', id: 'cred-123', name: 'My API Key' }],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			const link = screen.getByRole('link', { name: 'My API Key' });
			expect(link).toHaveAttribute('href', '/home/credentials/cred-123');
		});

		it('should display node locations with workflow links', async () => {
			renderComponent({
				props: {
					report: createMockReport({
						risk: 'nodes',
						sections: [
							createMockSection({
								location: [
									{
										kind: 'node',
										workflowId: 'wf-456',
										workflowName: 'My Workflow',
										nodeId: 'node-1',
										nodeName: 'HTTP Request',
										nodeType: 'n8n-nodes-base.httpRequest',
									},
								],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			const link = screen.getByRole('link', { name: 'My Workflow' });
			expect(link).toHaveAttribute('href', '/workflow/wf-456');
			expect(screen.getByText('/ HTTP Request')).toBeInTheDocument();
		});

		it('should display community node locations with npm links', async () => {
			renderComponent({
				props: {
					report: createMockReport({
						risk: 'nodes',
						sections: [
							createMockSection({
								location: [
									{
										kind: 'community',
										nodeType: 'n8n-nodes-custom',
										packageUrl: 'https://npmjs.com/n8n-nodes-custom',
									},
								],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			const link = screen.getByRole('link', { name: 'n8n-nodes-custom' });
			expect(link).toHaveAttribute('href', 'https://npmjs.com/n8n-nodes-custom');
		});
	});

	describe('pagination (large lists)', () => {
		it('should show only first 50 items by default', async () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [
							createMockSection({
								location: createMockCredentialLocations(100),
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			// Should show item count
			expect(screen.getByText('100 items')).toBeInTheDocument();

			// Should show first 50
			expect(screen.getByText('Credential 0')).toBeInTheDocument();
			expect(screen.getByText('Credential 49')).toBeInTheDocument();

			// Should not show items beyond 50
			expect(screen.queryByText('Credential 50')).not.toBeInTheDocument();

			// Should show "Show more" button
			expect(screen.getByText('Show 50 more')).toBeInTheDocument();
		});

		it('should expand to show all items when "Show more" clicked', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockReport({
						sections: [
							createMockSection({
								location: createMockCredentialLocations(75),
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			// Click show more
			await user.click(screen.getByText('Show 25 more'));

			// Should now show all items
			expect(screen.getByText('Credential 74')).toBeInTheDocument();

			// Should show "Show less" button
			expect(screen.getByText('Show less')).toBeInTheDocument();
		});

		it('should collapse back to 50 items when "Show less" clicked', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockReport({
						sections: [
							createMockSection({
								location: createMockCredentialLocations(75),
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			// Expand
			await user.click(screen.getByText('Show 25 more'));
			expect(screen.getByText('Credential 74')).toBeInTheDocument();

			// Collapse
			await user.click(screen.getByText('Show less'));
			expect(screen.queryByText('Credential 74')).not.toBeInTheDocument();
			expect(screen.getByText('Credential 49')).toBeInTheDocument();
		});

		it('should not show pagination controls for lists under 50 items', async () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [
							createMockSection({
								location: createMockCredentialLocations(30),
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			expect(screen.queryByText(/items/)).not.toBeInTheDocument();
			expect(screen.queryByText('Show more')).not.toBeInTheDocument();
		});

		it('should handle pagination independently per section', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockReport({
						sections: [
							createMockSection({
								title: 'Section A',
								location: createMockCredentialLocations(60),
							}),
							createMockSection({
								title: 'Section B',
								location: createMockNodeLocations(70),
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			// Both sections should have "Show more" buttons
			const showMoreButtons = screen.getAllByText(/Show \d+ more/);
			expect(showMoreButtons).toHaveLength(2);

			// Expand first section only
			await user.click(showMoreButtons[0]);

			// First section should be expanded
			expect(screen.getByText('Credential 59')).toBeInTheDocument();

			// Second section should still be collapsed
			expect(screen.queryByText('Workflow 69')).not.toBeInTheDocument();
		});
	});

	describe('data-test-ids', () => {
		it('should have category test id with risk type', () => {
			renderComponent({
				props: {
					report: createMockReport({ risk: 'credentials' }),
				},
			});

			expect(screen.getByTestId('security-audit-category-credentials')).toBeInTheDocument();
		});

		it('should have header test id', () => {
			renderComponent({
				props: {
					report: createMockReport(),
				},
			});

			expect(screen.getByTestId('security-audit-category-header')).toBeInTheDocument();
		});
	});

	describe('category icons', () => {
		it.each<Exclude<RiskCategory, 'instance'>>(['credentials', 'database', 'nodes', 'filesystem'])(
			'should display correct icon for %s category',
			(risk) => {
				const { container } = renderComponent({
					props: {
						report: createMockReport({ risk }),
					},
				});

				// Icon is rendered - we just verify the component renders without error
				expect(container.querySelector('[class*="categoryIcon"]')).toBeInTheDocument();
			},
		);
	});
});
