import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, screen } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { WHATS_NEW_MODAL_KEY, VERSIONS_MODAL_KEY } from '@/app/constants';
import { useVersionsStore } from '@n8n/stores/versions.store';
import { useUsersStore } from '@n8n/stores/users.store';
import type { Version } from '@n8n/rest-api-client/api/versions';

import WhatsNewModal from './WhatsNewModal.vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';

vi.mock('@/app/composables/usePageRedirectionHelper', () => {
	const goToVersions = vi.fn();
	return {
		usePageRedirectionHelper: vi.fn().mockReturnValue({
			goToVersions,
		}),
	};
});

vi.mock('@n8n/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => {
			return {
				track,
			};
		},
	};
});

const renderComponent = createComponentRenderer(WhatsNewModal, {
	props: {
		modalName: WHATS_NEW_MODAL_KEY,
	},
});

let uiStore: MockedStore<typeof useUIStore>;
let versionsStore: MockedStore<typeof useVersionsStore>;
let usersStore: MockedStore<typeof useUsersStore>;

const telemetry = useTelemetry();
const pageRedirectionHelper = usePageRedirectionHelper();

const currentVersion: Version = {
	name: '1.100.0',
	nodes: [],
	createdAt: '2025-06-24T00:00:00Z',
	description: 'Latest version description',
	documentationUrl: 'https://docs.n8n.io',
	hasBreakingChange: false,
	hasSecurityFix: false,
	hasSecurityIssue: false,
	securityIssueFixVersion: '',
};

describe('WhatsNewModal', () => {
	beforeEach(() => {
		// The dialog scrolls to an article as soon as it has focus; jsdom has no scrolling.
		Element.prototype.scrollIntoView = vi.fn();
		createTestingPinia();
		uiStore = mockedStore(useUIStore);
		uiStore.modalStateById = {
			[WHATS_NEW_MODAL_KEY]: {
				open: true,
			},
		};

		versionsStore = mockedStore(useVersionsStore);
		usersStore = mockedStore(useUsersStore);
		versionsStore.hasVersionUpdates = false;
		usersStore.canUserUpdateVersion = true;
		versionsStore.currentVersion = currentVersion;
		versionsStore.latestVersion = currentVersion;
		versionsStore.nextVersions = [];
		versionsStore.whatsNew = {
			createdAt: '2025-06-19T12:35:14.454Z',
			updatedAt: null,
			title: "What's New in n8n 1.100.0",
			calloutText:
				'Convert large workflows into sub-workflows for better modularity and performance.',
			footer: 'This release contains performance improvements and bug fixes.',
			items: [
				{
					id: 1,
					title: 'Convert to sub-workflow',
					content:
						'Large, monolithic workflows can slow things down. They’re harder to maintain, ' +
						'tougher to debug, and more difficult to scale. With sub-workflows, you can take a ' +
						'more modular approach, breaking up big workflows into smaller, manageable parts that ' +
						'are easier to reuse, test, understand, and explain.\n\nUntil now, creating sub-workflows ' +
						'required copying and pasting nodes manually, setting up a new workflow from scratch, and ' +
						'reconnecting everything by hand. **Convert to sub-workflow** allows you to simplify this ' +
						'process into a single action, so you can spend more time building and less time restructuring.\n\n' +
						'### How it works\n\n1. Highlight the nodes you want to convert to a sub-workflow. These must:\n' +
						'    - Be fully connected, meaning no missing steps in between them\n' +
						'    - Start from a single starting node\n' +
						'    - End with a single node\n' +
						'2. Right-click to open the context menu and select ' +
						'**Convert to sub-workflow**\n' +
						'    - Or use the shortcut: `Alt + X`\n' +
						'3. n8n will:\n' +
						'    - Open a new tab containing the selected nodes\n' +
						'    - Preserve all node parameters as-is\n' +
						'    - Replace the selected nodes in the original workflow with a **Call My Sub-workflow** node\n\n' +
						'_Note:_ You will need to manually adjust the field types in the Start and Return nodes in the new sub-workflow.\n\n' +
						'This makes it easier to keep workflows modular, performant, and easier to maintain.\n\n' +
						'Learn more about [sub-workflows](https://docs.n8n.io/flow-logic/subworkflows/).\n\n' +
						'This release contains performance improvements and bug fixes.\n\n' +
						'@[youtube](ZCuL2e4zC_4)\n\n' +
						'Fusce malesuada diam eget tincidunt ultrices. Mauris quis mauris mollis, venenatis risus ut.\n\n' +
						'## Second level title\n\n### Third level title\n\nThis **is bold**, this _in italics_.\n' +
						"~~Strikethrough is also something we support~~.\n\nHere's a peace of code:\n\n" +
						'```typescript\nconst props = defineProps<{\n\tmodalName: string;\n\tdata: {\n\t\tarticleId: number;\n\t};\n}>();\n```\n\n' +
						'Inline `code also works` withing text.\n\nThis is a list:\n- first\n- second\n- third\n\nAnd this list is ordered\n' +
						'1. foo\n2. bar\n3. qux\n\nDividers:\n\nThree or more...\n\n---\n\nHyphens\n\n***\n\nAsterisks\n\n___\n\nUnderscores\n\n---\n\n' +
						'<details>\n<summary>Fixes (4)</summary>\n\n' +
						'- **Credential Storage Issue** Resolved an issue where credentials would occasionally become inaccessible after server restarts\n' +
						'- **Webhook Timeout Handling** Fixed timeout issues with long-running webhook requests\n' +
						'- **Node Connection Validation** Improved validation for node connections to prevent invalid workflow configurations\n' +
						'- **Memory Leak in Execution Engine** Fixed memory leak that could occur during long-running workflow executions\n\n</details>\n\n',
					createdAt: '2025-06-19T12:35:14.454Z',
					updatedAt: '2025-06-19T12:41:53.220Z',
					publishedAt: '2025-06-19T12:41:53.216Z',
				},
				{
					id: 2,
					title: 'Gateway credits',
					content:
						'Try supported AI models without setting up credentials.\n\n' +
						'[Learn more in the docs](https://docs.n8n.io/gateway-credits)',
					createdAt: '2025-06-19T12:35:14.454Z',
					updatedAt: null,
					publishedAt: '2025-06-19T12:41:53.216Z',
				},
			],
		};
		versionsStore.whatsNewArticles = versionsStore.whatsNew.items;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not render update button when no version updates available', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				data: {
					articleId: 1,
				},
			},
		});

		await waitFor(() => expect(getByTestId('whatsNew-modal')).toBeInTheDocument());
		await waitFor(() => expect(getByTestId('whats-new-item-1')).toBeInTheDocument());

		expect(screen.getByRole('dialog', { name: 'What’s new' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 2, name: 'What’s new' })).toBeInTheDocument();
		const changelog = getByTestId('whats-new-modal-changelog-link');
		expect(changelog).toHaveAttribute('href', 'https://docs.n8n.io/changelog');
		expect(changelog).toHaveAttribute('target', '_blank');
		// The secondary action lives in the footer, not in the title row.
		expect(changelog.closest('[data-slot="dialog-footer"]')).not.toBeNull();
		expect(getByTestId('whats-new-item-1')).toMatchSnapshot();
		expect(queryByTestId('whats-new-modal-update-button')).not.toBeInTheDocument();
		expect(queryByTestId('whats-new-modal-next-versions-link')).not.toBeInTheDocument();
	});

	it('renders a player without a fixed height so the stylesheet can keep it 16:9', async () => {
		const { getByTestId } = renderComponent({ props: { data: { articleId: 1 } } });

		await waitFor(() => expect(getByTestId('whats-new-item-1')).toBeInTheDocument());

		const player = getByTestId('whats-new-item-1').querySelector('iframe');
		expect(player).toHaveAttribute('src', expect.stringContaining('ZCuL2e4zC_4'));
		expect(player).toHaveAttribute('width', '100%');
		expect(player).not.toHaveAttribute('height');
	});

	it('renders a link that ends an article as a button and keeps it out of the body', async () => {
		const { getByTestId } = renderComponent({ props: { data: { articleId: 2 } } });

		await waitFor(() => expect(getByTestId('whats-new-item-2')).toBeInTheDocument());

		const article = getByTestId('whats-new-item-2');
		const cta = getByTestId('whats-new-item-cta');
		expect(cta).toHaveTextContent('Learn more in the docs');
		expect(cta).toHaveAttribute('href', 'https://docs.n8n.io/gateway-credits');
		expect(cta).toHaveAttribute('target', '_blank');
		expect(article.querySelectorAll('a')).toHaveLength(1);
	});

	describe('read tracking', () => {
		it('marks only the requested article as read when opened', async () => {
			const { getByTestId } = renderComponent({ props: { data: { articleId: 2 } } });

			await waitFor(() => expect(getByTestId('whats-new-item-2')).toBeInTheDocument());
			await waitFor(() => expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalled());

			expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledTimes(1);
			expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledWith(2);
			expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
		});

		it('falls back to the first article when opened without one', async () => {
			const { getByTestId } = renderComponent({ props: { data: {} } });

			await waitFor(() => expect(getByTestId('whats-new-item-1')).toBeInTheDocument());
			await waitFor(() => expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledWith(1));

			expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledTimes(1);
		});

		it('leaves the body at the top when opened at the first article', async () => {
			const { getByTestId } = renderComponent({ props: { data: { articleId: 1 } } });

			await waitFor(() => expect(getByTestId('whats-new-item-1')).toBeInTheDocument());
			await waitFor(() => expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledWith(1));

			// The update notice leads the first article; a scroll would hide it.
			expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
		});

		it('marks an article as read once the reader rests on it', async () => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			try {
				const { getByTestId, baseElement } = renderComponent({
					props: { data: { articleId: 1 } },
				});

				await waitFor(() => expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledWith(1));
				// Let the opening settle before the reader starts to scroll.
				await vi.advanceTimersByTimeAsync(200);
				versionsStore.setWhatsNewArticleRead.mockClear();

				// The dialog is portalled, so the scroll container is not under `container`.
				const scroller = baseElement.querySelector('[data-slot="dialog-body"]');
				if (!(scroller instanceof HTMLElement)) throw new Error('no scroll container');
				const rect = (top: number, bottom: number) =>
					({ top, bottom, height: bottom - top }) as DOMRect;
				vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(rect(0, 600));
				vi.spyOn(getByTestId('whats-new-item-1'), 'getBoundingClientRect').mockReturnValue(
					rect(-900, 100),
				);
				vi.spyOn(getByTestId('whats-new-item-2'), 'getBoundingClientRect').mockReturnValue(
					rect(100, 400),
				);

				scroller.dispatchEvent(new Event('scroll'));
				await vi.advanceTimersByTimeAsync(799);
				expect(versionsStore.setWhatsNewArticleRead).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(1);
				expect(versionsStore.setWhatsNewArticleRead).toHaveBeenCalledWith(2);
				expect(versionsStore.setWhatsNewArticleRead).not.toHaveBeenCalledWith(1);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	it('should render a close button that dismisses the modal', async () => {
		const { getByTestId, getByRole } = renderComponent({
			props: {
				data: {
					articleId: 1,
				},
			},
		});

		await waitFor(() => expect(getByTestId('whatsNew-modal')).toBeInTheDocument());

		const closeButton = getByRole('button', { name: 'Close dialog' });
		expect(closeButton).toBeInTheDocument();

		await userEvent.click(closeButton);

		expect(uiStore.closeModal).toHaveBeenCalledWith(WHATS_NEW_MODAL_KEY);
	});

	it('should render with update button enabled', async () => {
		versionsStore.hasVersionUpdates = true;
		versionsStore.nextVersions = [
			{
				name: '1.100.1',
				nodes: [],
				createdAt: '2025-06-24T00:00:00Z',
				description: 'Next version description',
				documentationUrl: 'https://docs.n8n.io',
				hasBreakingChange: false,
				hasSecurityFix: false,
				hasSecurityIssue: false,
				securityIssueFixVersion: '',
			},
		];

		const { getByTestId } = renderComponent({
			props: {
				data: {
					articleId: 1,
				},
			},
		});

		await waitFor(() => expect(getByTestId('whatsNew-modal')).toBeInTheDocument());
		await waitFor(() => expect(getByTestId('whats-new-item-1')).toBeInTheDocument());

		expect(getByTestId('whats-new-modal-update-button')).toBeEnabled();
		expect(getByTestId('whats-new-modal-next-versions-link')).toBeInTheDocument();
		expect(getByTestId('whats-new-modal-next-versions-link')).toHaveTextContent('1 version behind');
	});

	it('leads the first post with the update notice', async () => {
		versionsStore.hasVersionUpdates = true;
		versionsStore.hasSignificantUpdates = true;
		versionsStore.latestVersion = { ...currentVersion, name: '1.101.0' };

		const { getByTestId, queryByTestId } = renderComponent({ props: { data: { articleId: 1 } } });

		await waitFor(() => expect(getByTestId('whats-new-item-1')).toBeInTheDocument());

		const notice = getByTestId('whats-new-modal-update-notice');
		expect(notice).toHaveTextContent('Update to 1.101.0');
		// It scrolls with the posts and sits right before the first one.
		expect(notice.closest('[data-slot="dialog-body"]')).not.toBeNull();
		expect(notice.nextElementSibling).toBe(getByTestId('whats-new-item-1'));

		versionsStore.hasSignificantUpdates = false;
		await waitFor(() =>
			expect(queryByTestId('whats-new-modal-update-notice')).not.toBeInTheDocument(),
		);
	});

	it('should take user to update page when Update is clicked', async () => {
		versionsStore.hasVersionUpdates = true;

		const { getByTestId } = renderComponent({
			props: {
				data: {
					articleId: 1,
				},
			},
		});

		await waitFor(() => expect(getByTestId('whatsNew-modal')).toBeInTheDocument());
		await waitFor(() => expect(getByTestId('whats-new-item-1')).toBeInTheDocument());

		await userEvent.click(getByTestId('whats-new-modal-update-button'));

		expect(telemetry.track).toHaveBeenCalledWith('User clicked on update button', {
			source: 'whats-new-modal',
		});
		expect(pageRedirectionHelper.goToVersions).toHaveBeenCalledWith();
	});

	it('should open the next versions drawer when clicking on the next versions link', async () => {
		versionsStore.hasVersionUpdates = true;

		const { getByTestId } = renderComponent({
			props: {
				data: {
					articleId: 1,
				},
			},
		});

		await waitFor(() => expect(getByTestId('whatsNew-modal')).toBeInTheDocument());
		await waitFor(() => expect(getByTestId('whats-new-item-1')).toBeInTheDocument());

		await userEvent.click(getByTestId('whats-new-modal-next-versions-link'));

		expect(uiStore.openModal).toHaveBeenCalledWith(VERSIONS_MODAL_KEY);
	});

	describe('Update button permission tests', () => {
		it('should not render update button when hasVersionUpdates is false', async () => {
			versionsStore.hasVersionUpdates = false;
			usersStore.canUserUpdateVersion = true;

			const { queryByTestId } = renderComponent({
				props: {
					data: {
						articleId: 1,
					},
				},
			});

			await waitFor(() => expect(queryByTestId('whatsNew-modal')).toBeInTheDocument());
			expect(queryByTestId('whats-new-modal-update-button')).not.toBeInTheDocument();
		});

		it('should render update button disabled when canUserUpdateVersion is false', async () => {
			versionsStore.hasVersionUpdates = true;
			usersStore.canUserUpdateVersion = false;

			const { getByTestId } = renderComponent({
				props: {
					data: {
						articleId: 1,
					},
				},
			});

			await waitFor(() => expect(getByTestId('whatsNew-modal')).toBeInTheDocument());

			const updateButton = getByTestId('whats-new-modal-update-button');
			expect(updateButton).toBeInTheDocument();
			expect(updateButton).toBeDisabled();
		});

		it('should render update button enabled when canUserUpdateVersion is true and hasVersionUpdates is true', async () => {
			versionsStore.hasVersionUpdates = true;
			usersStore.canUserUpdateVersion = true;

			const { getByTestId } = renderComponent({
				props: {
					data: {
						articleId: 1,
					},
				},
			});

			await waitFor(() => expect(getByTestId('whatsNew-modal')).toBeInTheDocument());
			const updateButton = getByTestId('whats-new-modal-update-button');
			expect(updateButton).toBeInTheDocument();
			expect(updateButton).toBeEnabled();
		});
	});
});
