import { createComponentRenderer } from '@/__tests__/render';
import { EXECUTION_DATA_REDACTION_DOCS_URL } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import type { RedactionInfo } from 'n8n-workflow';
import RedactedDataState from './RedactedDataState.vue';

const renderComponent = createComponentRenderer(RedactedDataState);
const i18n = useI18n();

describe('RedactedDataState', () => {
	it('should render title', () => {
		const { getByText, getByTestId } = renderComponent({
			props: { title: 'Data is redacted', canReveal: false },
		});

		expect(getByTestId('ndv-data-redacted')).toBeInTheDocument();
		expect(getByText('Data is redacted')).toBeInTheDocument();
	});

	it('should show the dynamic credentials description', () => {
		const { getByText, queryByText, getByTestId } = renderComponent({
			props: { title: 'Redacted', reason: 'dynamic_credentials', canReveal: false },
		});

		expect(
			getByText(i18n.baseText('ndv.redacted.dynamicCredentials.description')),
		).toBeInTheDocument();
		expect(
			queryByText(i18n.baseText('ndv.redacted.description.sentence1')),
		).not.toBeInTheDocument();
		expect(getByTestId('redacted-data-docs-link').closest('a')).toHaveAttribute(
			'href',
			EXECUTION_DATA_REDACTION_DOCS_URL,
		);
	});

	it('should show the no-permission description for workflow-policy redaction without reveal permission', () => {
		const { getByText, queryByText } = renderComponent({
			props: { title: 'Redacted', reason: 'workflow_redaction_policy', canReveal: false },
		});

		expect(getByText(i18n.baseText('ndv.redacted.noPermission.description'))).toBeInTheDocument();
		expect(queryByText(i18n.baseText('ndv.redacted.description.link'))).not.toBeInTheDocument();
	});

	it('should show the workflow settings link for workflow-policy redaction with reveal permission', () => {
		const { getByText } = renderComponent({
			props: { title: 'Redacted', reason: 'workflow_redaction_policy', canReveal: true },
		});

		expect(getByText(i18n.baseText('ndv.redacted.description.sentence1'))).toBeInTheDocument();
		expect(getByText(i18n.baseText('ndv.redacted.description.link'))).toBeInTheDocument();
	});

	describe('redaction by a sub-workflow', () => {
		const description = i18n.baseText('ndv.redacted.subWorkflow.description');

		it('says a sub-workflow caused the redaction and keeps the reveal button', () => {
			const { getByText, queryByText, getByTestId } = renderComponent({
				props: {
					title: 'Redacted',
					reason: 'sub_workflow_redaction_policy',
					canReveal: true,
				},
			});

			expect(getByText(description)).toBeInTheDocument();
			// The calling workflow's settings do not control this redaction.
			expect(queryByText(i18n.baseText('ndv.redacted.description.link'))).not.toBeInTheDocument();
			expect(getByTestId('ndv-reveal-redacted-data')).toBeInTheDocument();
		});

		it('shows no reveal button without permission', () => {
			const { getByText, queryByTestId } = renderComponent({
				props: {
					title: 'Redacted',
					reason: 'sub_workflow_redaction_policy',
					canReveal: false,
				},
			});

			expect(getByText(description)).toBeInTheDocument();
			expect(queryByTestId('ndv-reveal-redacted-data')).not.toBeInTheDocument();
		});
	});

	describe('credential redaction', () => {
		const credentialToShare = { id: 'alice-gmail', name: "Alice's Gmail" };
		const props: InstanceType<typeof RedactedDataState>['$props'] = {
			title: 'Redacted',
			reason: 'credential_inaccessible',
			canReveal: false,
			credentialToShare,
		};

		it('says why the data is hidden and links to the credential sharing', async () => {
			const { getByText, queryByText, getByTestId, emitted } = renderComponent({ props });

			expect(
				getByText(i18n.baseText('ndv.redacted.shareCredential.description'), { exact: false }),
			).toBeInTheDocument();
			expect(
				queryByText(i18n.baseText('ndv.redacted.noPermission.description'), { exact: false }),
			).not.toBeInTheDocument();
			const link = getByTestId('redacted-data-share-credential');
			expect(link).toHaveTextContent(
				i18n.baseText('ndv.redacted.shareCredential.link', {
					interpolate: { credential: credentialToShare.name },
				}),
			);

			link.click();
			expect(emitted().shareCredential).toHaveLength(1);
		});

		it('shows the credential cause without a share link when the viewer cannot share it', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { ...props, credentialToShare: undefined },
			});

			expect(getByTestId('ndv-data-redacted')).toHaveTextContent(
				i18n.baseText('ndv.redacted.shareCredential.description'),
			);
			expect(getByTestId('ndv-data-redacted')).not.toHaveTextContent(
				i18n.baseText('ndv.redacted.noPermission.description'),
			);
			expect(queryByTestId('redacted-data-share-credential')).not.toBeInTheDocument();
			expect(queryByTestId('ndv-reveal-redacted-data')).not.toBeInTheDocument();
		});

		it('uses the fallback sharing label when the credential name is unavailable', () => {
			const { getByTestId } = renderComponent({
				props: { ...props, credentialToShare: { id: 'credential-id', name: '' } },
			});

			expect(getByTestId('redacted-data-share-credential')).toHaveTextContent(
				i18n.baseText('ndv.redacted.shareCredential.linkNoName'),
			);
		});
	});

	it('should show reveal button when canReveal is true', () => {
		const { getByTestId } = renderComponent({
			props: { title: 'Redacted', canReveal: true },
		});

		expect(getByTestId('ndv-reveal-redacted-data')).toBeInTheDocument();
	});

	it('should not show reveal button when canReveal is false', () => {
		const { queryByTestId } = renderComponent({
			props: { title: 'Redacted', canReveal: false },
		});

		expect(queryByTestId('ndv-reveal-redacted-data')).not.toBeInTheDocument();
	});

	it('should emit "reveal" when reveal button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { title: 'Redacted', canReveal: true },
		});

		getByTestId('ndv-reveal-redacted-data').click();

		expect(emitted('reveal')).toHaveLength(1);
	});

	it('should emit "openSettings" when workflow settings link is clicked', async () => {
		const { getByText, emitted } = renderComponent({
			props: { title: 'Redacted', canReveal: true },
		});

		getByText(i18n.baseText('ndv.redacted.description.link')).click();

		expect(emitted('openSettings')).toHaveLength(1);
	});

	it.each<{ reason: RedactionInfo['reason']; canReveal: boolean }>([
		{ reason: 'workflow_redaction_policy', canReveal: true },
		{ reason: 'workflow_redaction_policy', canReveal: false },
		{ reason: 'dynamic_credentials', canReveal: false },
		{ reason: 'sub_workflow_redaction_policy', canReveal: true },
		{ reason: 'credential_inaccessible', canReveal: false },
	])('should show docs link regardless of redaction reason (%o)', ({ reason, canReveal }) => {
		const { getByTestId } = renderComponent({
			props: { title: 'Redacted', reason, canReveal },
		});

		expect(getByTestId('redacted-data-docs-link').closest('a')).toHaveAttribute(
			'href',
			EXECUTION_DATA_REDACTION_DOCS_URL,
		);
	});
});
