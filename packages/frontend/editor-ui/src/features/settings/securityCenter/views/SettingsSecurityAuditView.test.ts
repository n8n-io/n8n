import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsSecurityAuditView from './SettingsSecurityAuditView.vue';
import { useSecurityAuditStore } from '../securityCenter.store';
import type { SecurityAuditResponse } from '../securityCenter.api';

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({
		set: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showMessage: vi.fn(),
		showError: vi.fn(),
	})),
}));

const mockAuditResponse: SecurityAuditResponse = {
	'Credentials Risk Report': {
		risk: 'credentials',
		sections: [
			{
				title: 'Unused credentials',
				description: 'Credentials not used',
				recommendation: 'Remove them',
				location: [{ kind: 'credential', id: 'cred-1', name: 'Test Cred' }],
			},
		],
	},
	'Nodes Risk Report': {
		risk: 'nodes',
		sections: [],
	},
};

describe('SettingsSecurityAuditView', () => {
	const renderComponent = createComponentRenderer(SettingsSecurityAuditView, {
		pinia: createTestingPinia(),
	});

	describe('initial empty state', () => {
		it('should display empty state message before first audit', () => {
			renderComponent();

			expect(screen.getByTestId('settings-security-center')).toBeInTheDocument();
			expect(screen.getByText('Check your security posture')).toBeInTheDocument();
		});

		it('should display the run security check button', () => {
			renderComponent();

			expect(screen.getByTestId('run-security-check-button')).toBeInTheDocument();
			expect(screen.getByText('Run Security Check')).toBeInTheDocument();
		});

		it('should not show loading or results', () => {
			renderComponent();

			expect(screen.queryByTestId('security-center-loading')).not.toBeInTheDocument();
			expect(screen.queryByTestId('security-center-results')).not.toBeInTheDocument();
			expect(screen.queryByTestId('security-center-error')).not.toBeInTheDocument();
		});
	});

	describe('loading state', () => {
		it('should display loading indicator when audit is running', () => {
			const pinia = createTestingPinia({
				initialState: {
					securityAudit: {
						isLoading: true,
						auditResult: null,
						lastRunAt: null,
						error: null,
					},
				},
			});
			renderComponent({ pinia });

			expect(screen.getByTestId('security-center-loading')).toBeInTheDocument();
			expect(screen.getByText(/this may take up to a minute/i)).toBeInTheDocument();
		});

		it('should hide empty state when loading', () => {
			const pinia = createTestingPinia({
				initialState: {
					securityAudit: {
						isLoading: true,
						auditResult: null,
						lastRunAt: null,
						error: null,
					},
				},
			});
			renderComponent({ pinia });

			expect(screen.queryByText('Check your security posture')).not.toBeInTheDocument();
		});
	});

	describe('error state', () => {
		it('should display error callout when audit fails', () => {
			const pinia = createTestingPinia({
				initialState: {
					securityAudit: {
						isLoading: false,
						auditResult: null,
						lastRunAt: null,
						error: new Error('Audit failed: connection timeout'),
					},
				},
			});
			renderComponent({ pinia });

			expect(screen.getByTestId('security-center-error')).toBeInTheDocument();
			expect(screen.getByText('Audit failed: connection timeout')).toBeInTheDocument();
		});

		it('should hide loading and empty states when error', () => {
			const pinia = createTestingPinia({
				initialState: {
					securityAudit: {
						isLoading: false,
						auditResult: null,
						lastRunAt: null,
						error: new Error('Some error'),
					},
				},
			});
			renderComponent({ pinia });

			expect(screen.queryByTestId('security-center-loading')).not.toBeInTheDocument();
			expect(screen.queryByText('Check your security posture')).not.toBeInTheDocument();
		});
	});

	describe('results state', () => {
		it('should display results when lastRunAt is set', () => {
			const pinia = createTestingPinia({
				initialState: {
					securityAudit: {
						auditResult: mockAuditResponse,
						lastRunAt: new Date(),
						isLoading: false,
						error: null,
					},
				},
			});
			renderComponent({ pinia });

			expect(screen.getByTestId('security-center-results')).toBeInTheDocument();
		});

		it('should display last checked text when results exist', () => {
			const pinia = createTestingPinia({
				initialState: {
					securityAudit: {
						auditResult: mockAuditResponse,
						lastRunAt: new Date('2026-01-15T10:30:00'),
						isLoading: false,
						error: null,
					},
				},
			});
			renderComponent({ pinia });

			expect(screen.getByText(/last checked/i)).toBeInTheDocument();
		});
	});

	describe('run security check button interaction', () => {
		it('should call runAudit when button clicked', async () => {
			const user = userEvent.setup();
			const pinia = createTestingPinia({
				stubActions: false,
				initialState: {
					securityAudit: {
						isLoading: false,
						auditResult: null,
						lastRunAt: null,
						error: null,
					},
				},
			});
			renderComponent({ pinia });

			const store = useSecurityAuditStore(pinia);
			const runAuditSpy = vi.spyOn(store, 'runAudit').mockResolvedValue();

			await user.click(screen.getByTestId('run-security-check-button'));

			expect(runAuditSpy).toHaveBeenCalled();
		});

		it('should show button while loading', () => {
			const pinia = createTestingPinia({
				initialState: {
					securityAudit: {
						isLoading: true,
						auditResult: null,
						lastRunAt: null,
						error: null,
					},
				},
			});
			renderComponent({ pinia });

			const button = screen.getByTestId('run-security-check-button');
			expect(button).toBeInTheDocument();
		});
	});

	describe('data-test-ids', () => {
		it('should have main container test id', () => {
			renderComponent();

			expect(screen.getByTestId('settings-security-center')).toBeInTheDocument();
		});

		it('should have run button test id', () => {
			renderComponent();

			expect(screen.getByTestId('run-security-check-button')).toBeInTheDocument();
		});
	});
});
