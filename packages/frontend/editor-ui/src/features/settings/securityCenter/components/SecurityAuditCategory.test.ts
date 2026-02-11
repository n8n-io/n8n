import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import SecurityAuditCategory from './SecurityAuditCategory.vue';
import type {
	StandardReport,
	StandardSection,
	RiskCategory,
	AdvisoryDetails,
	AdvisorySection,
	AdvisoryReport,
} from '../securityCenter.api';

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

const createMockAdvisoryDetails = (overrides: Partial<AdvisoryDetails> = {}): AdvisoryDetails => ({
	kind: 'advisory',
	ghsaId: 'GHSA-xxxx-yyyy-zzzz',
	cveId: 'CVE-2024-12345',
	severity: 'high',
	summary: 'Test vulnerability summary',
	vulnerableVersionRange: '< 1.0.0',
	patchedVersions: '>= 1.0.0',
	publishedAt: '2024-01-15T00:00:00Z',
	htmlUrl: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz',
	...overrides,
});

const createMockAdvisorySection = (overrides: Partial<AdvisorySection> = {}): AdvisorySection => ({
	title: 'Test Advisory Section',
	description: 'Advisory section description',
	recommendation: 'Upgrade to latest version',
	advisories: [],
	affectsCurrentVersion: false,
	...overrides,
});

const createMockAdvisoryReport = (overrides: Partial<AdvisoryReport> = {}): AdvisoryReport => ({
	risk: 'advisories',
	sections: [],
	...overrides,
});

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

		it('should display issue count badge when sections have actionable items', () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [
							createMockSection({ location: createMockCredentialLocations(1) }),
							createMockSection({ location: createMockCredentialLocations(1) }),
						],
					}),
				},
			});

			expect(screen.getByText('2 items to review')).toBeInTheDocument();
		});

		it('should display singular text for single section with actionable items', () => {
			renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection({ location: createMockCredentialLocations(1) })],
					}),
				},
			});

			expect(screen.getByText('1 item to review')).toBeInTheDocument();
		});

		it('should not display badge when no sections', () => {
			renderComponent({
				props: {
					report: createMockReport({ sections: [] }),
				},
			});

			expect(screen.queryByText(/item to review/)).not.toBeInTheDocument();
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

		it('should show warning icon for actionable issues', () => {
			const { container } = renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection({ location: createMockCredentialLocations(1) })],
					}),
				},
			});

			const warningIcon = container.querySelector('[class*="warning"]');
			expect(warningIcon).toBeInTheDocument();
		});

		it('should show success icon when sections have no actionable items', () => {
			const { container } = renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection(), createMockSection(), createMockSection()],
					}),
				},
			});

			// Sections with empty locations are not actionable, so show success
			const successIcon = container.querySelector('[class*="success"]');
			expect(successIcon).toBeInTheDocument();
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
			await user.click(screen.getByTestId('security-center-category-header'));
			expect(screen.getByText('Toggle Section')).toBeInTheDocument();

			// Click to collapse
			await user.click(screen.getByTestId('security-center-category-header'));
			expect(screen.queryByText('Toggle Section')).not.toBeInTheDocument();
		});

		it('should show "Nothing to review" message when expanded with no issues', () => {
			renderComponent({
				props: {
					report: createMockReport({ sections: [] }),
					initiallyExpanded: true,
				},
			});

			expect(screen.getByText('Nothing to review')).toBeInTheDocument();
		});

		it('should set aria-expanded to false when collapsed', () => {
			renderComponent({
				props: {
					report: createMockReport({ risk: 'credentials' }),
				},
			});

			const header = screen.getByRole('button', { name: /credentials/i });
			expect(header).toHaveAttribute('aria-expanded', 'false');
		});

		it('should set aria-expanded to true when expanded', () => {
			renderComponent({
				props: {
					report: createMockReport({ risk: 'credentials' }),
					initiallyExpanded: true,
				},
			});

			const header = screen.getByRole('button', { name: /credentials/i });
			expect(header).toHaveAttribute('aria-expanded', 'true');
		});

		it('should toggle aria-expanded on click', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockReport({
						risk: 'credentials',
						sections: [createMockSection({ title: 'Test' })],
					}),
				},
			});

			const header = screen.getByRole('button', { name: /credentials/i });
			expect(header).toHaveAttribute('aria-expanded', 'false');

			await user.click(header);
			expect(header).toHaveAttribute('aria-expanded', 'true');

			await user.click(header);
			expect(header).toHaveAttribute('aria-expanded', 'false');
		});

		it('should toggle content on Enter key', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection({ title: 'Keyboard Section' })],
					}),
				},
			});

			const header = screen.getByRole('button', { name: /credentials/i });
			expect(screen.queryByText('Keyboard Section')).not.toBeInTheDocument();

			header.focus();
			await user.keyboard('{Enter}');
			expect(screen.getByText('Keyboard Section')).toBeInTheDocument();
		});

		it('should toggle content on Space key', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockReport({
						sections: [createMockSection({ title: 'Space Section' })],
					}),
				},
			});

			const header = screen.getByRole('button', { name: /credentials/i });
			expect(screen.queryByText('Space Section')).not.toBeInTheDocument();

			header.focus();
			await user.keyboard(' ');
			expect(screen.getByText('Space Section')).toBeInTheDocument();
		});

		it('should expose content region with aria-label when expanded', () => {
			renderComponent({
				props: {
					report: createMockReport({ risk: 'credentials', sections: [] }),
					initiallyExpanded: true,
				},
			});

			const region = screen.getByRole('region', { name: /credentials/i });
			expect(region).toBeInTheDocument();
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

			expect(screen.getByText('My API Key')).toBeInTheDocument();
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

			expect(screen.getByText('My Workflow')).toBeInTheDocument();
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

			expect(screen.getByTestId('security-center-category-credentials')).toBeInTheDocument();
		});

		it('should have header test id', () => {
			renderComponent({
				props: {
					report: createMockReport(),
				},
			});

			expect(screen.getByTestId('security-center-category-header')).toBeInTheDocument();
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

	describe('advisory rendering', () => {
		it('should render severity badge with correct text', () => {
			renderComponent({
				props: {
					report: createMockAdvisoryReport({
						sections: [
							createMockAdvisorySection({
								affectsCurrentVersion: true,
								advisories: [createMockAdvisoryDetails({ severity: 'high' })],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			expect(screen.getByText('High')).toBeInTheDocument();
		});

		it('should render GHSA ID as link', () => {
			renderComponent({
				props: {
					report: createMockAdvisoryReport({
						sections: [
							createMockAdvisorySection({
								affectsCurrentVersion: true,
								advisories: [
									createMockAdvisoryDetails({
										ghsaId: 'GHSA-test-link-1234',
										htmlUrl: 'https://github.com/advisories/GHSA-test-link-1234',
									}),
								],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			const link = screen.getByRole('link', { name: 'GHSA-test-link-1234' });
			expect(link).toHaveAttribute('href', 'https://github.com/advisories/GHSA-test-link-1234');
		});

		it('should render CVE ID when present', () => {
			renderComponent({
				props: {
					report: createMockAdvisoryReport({
						sections: [
							createMockAdvisorySection({
								affectsCurrentVersion: true,
								advisories: [createMockAdvisoryDetails({ cveId: 'CVE-2024-99999' })],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			expect(screen.getByText('(CVE-2024-99999)')).toBeInTheDocument();
		});

		it('should hide CVE ID when null', () => {
			renderComponent({
				props: {
					report: createMockAdvisoryReport({
						sections: [
							createMockAdvisorySection({
								affectsCurrentVersion: true,
								advisories: [createMockAdvisoryDetails({ cveId: null })],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			expect(screen.queryByText(/CVE-/)).not.toBeInTheDocument();
		});

		it('should render summary, vulnerable range, patched version, and published date', () => {
			renderComponent({
				props: {
					report: createMockAdvisoryReport({
						sections: [
							createMockAdvisorySection({
								affectsCurrentVersion: true,
								advisories: [
									createMockAdvisoryDetails({
										summary: 'XSS vulnerability in workflow editor',
										vulnerableVersionRange: '>= 1.0.0, < 2.0.0',
										patchedVersions: '>= 2.0.0',
										publishedAt: '2024-06-15T00:00:00Z',
									}),
								],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			expect(screen.getByText('XSS vulnerability in workflow editor')).toBeInTheDocument();
			expect(screen.getByText('>= 1.0.0, < 2.0.0')).toBeInTheDocument();
			expect(screen.getByText('>= 2.0.0')).toBeInTheDocument();
			// Published date is formatted by Intl.DateTimeFormat - check for the advisory-item
			expect(screen.getByTestId('advisory-item')).toBeInTheDocument();
		});
	});

	describe('historical advisories', () => {
		it('should show historical header with count badge', () => {
			renderComponent({
				props: {
					report: createMockAdvisoryReport({
						sections: [
							createMockAdvisorySection({
								affectsCurrentVersion: false,
								advisories: [
									createMockAdvisoryDetails(),
									createMockAdvisoryDetails({ ghsaId: 'GHSA-2222-3333-4444' }),
								],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			expect(screen.getByTestId('historical-advisories-header')).toBeInTheDocument();
			expect(screen.getByText('2')).toBeInTheDocument();
		});

		it('should expand historical on click', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockAdvisoryReport({
						sections: [
							createMockAdvisorySection({
								title: 'Historical Section Title',
								affectsCurrentVersion: false,
								advisories: [createMockAdvisoryDetails()],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			// Historical should be collapsed initially
			expect(screen.queryByText('Historical Section Title')).not.toBeInTheDocument();

			// Click to expand
			await user.click(screen.getByTestId('historical-advisories-header'));
			expect(screen.getByText('Historical Section Title')).toBeInTheDocument();
		});

		it('should toggle historical on Enter key', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockAdvisoryReport({
						sections: [
							createMockAdvisorySection({
								title: 'Historical Keyboard Test',
								affectsCurrentVersion: false,
								advisories: [createMockAdvisoryDetails()],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			const header = screen.getByTestId('historical-advisories-header');
			expect(screen.queryByText('Historical Keyboard Test')).not.toBeInTheDocument();

			header.focus();
			await user.keyboard('{Enter}');
			expect(screen.getByText('Historical Keyboard Test')).toBeInTheDocument();
		});

		it('should toggle historical on Space key', async () => {
			const user = userEvent.setup();
			renderComponent({
				props: {
					report: createMockAdvisoryReport({
						sections: [
							createMockAdvisorySection({
								title: 'Historical Space Test',
								affectsCurrentVersion: false,
								advisories: [createMockAdvisoryDetails()],
							}),
						],
					}),
					initiallyExpanded: true,
				},
			});

			const header = screen.getByTestId('historical-advisories-header');
			expect(screen.queryByText('Historical Space Test')).not.toBeInTheDocument();

			header.focus();
			await user.keyboard(' ');
			expect(screen.getByText('Historical Space Test')).toBeInTheDocument();
		});
	});
});
