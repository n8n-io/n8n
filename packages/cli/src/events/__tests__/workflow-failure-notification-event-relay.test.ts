import type { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import type { UserManagementMailer } from '@/user-management/email';

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

describe('WorkflowFailureNotificationEventRelay', () => {
	const mailer = mock<UserManagementMailer>({ isEmailSetUp: false });
	const userRepository = mock<UserRepository>();
	const logger = mock<Logger>();

	let eventService: EventService;
	let relay: WorkflowFailureNotificationEventRelay;

	beforeEach(() => {
		vi.clearAllMocks();
		eventService = new EventService();
		relay = new WorkflowFailureNotificationEventRelay(eventService, mailer, userRepository, logger);
		relay.init();
	});

	describe('instance-first-production-workflow-failed event', () => {
		const baseEvent: RelayEventMap['instance-first-production-workflow-failed'] = {
			projectId: 'project123',
			workflowId: 'workflow123',
			workflowName: 'Test Workflow',
			userId: 'user123',
		};

		it('should skip sending email when SMTP is not configured', async () => {
			Object.assign(mailer, { isEmailSetUp: false });

			eventService.emit('instance-first-production-workflow-failed', baseEvent);

			await flushPromises();

			expect(logger.debug).toHaveBeenCalledWith(
				'Skipping first production failure email - SMTP not configured',
				{
					workflowId: 'workflow123',
					userId: 'user123',
				},
			);
			expect(userRepository.findOneBy).not.toHaveBeenCalled();
			expect(mailer.workflowFailure).not.toHaveBeenCalled();
		});

		it('should warn and skip when user is not found', async () => {
			Object.assign(mailer, { isEmailSetUp: true });
			userRepository.findOneBy.mockResolvedValue(null);

			eventService.emit('instance-first-production-workflow-failed', baseEvent);

			await flushPromises();

			expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 'user123' });
			expect(logger.warn).toHaveBeenCalledWith(
				'Cannot send first production failure email - user not found or no email',
				{
					workflowId: 'workflow123',
					userId: 'user123',
				},
			);
			expect(mailer.workflowFailure).not.toHaveBeenCalled();
		});

		it('should warn and skip when user has no email', async () => {
			Object.assign(mailer, { isEmailSetUp: true });
			userRepository.findOneBy.mockResolvedValue({
				id: 'user123',
				email: '',
				firstName: 'John',
			} as any);

			eventService.emit('instance-first-production-workflow-failed', baseEvent);

			await flushPromises();

			expect(logger.warn).toHaveBeenCalledWith(
				'Cannot send first production failure email - user not found or no email',
				{
					workflowId: 'workflow123',
					userId: 'user123',
				},
			);
			expect(mailer.workflowFailure).not.toHaveBeenCalled();
		});

		it('should send email successfully when user is found with valid email', async () => {
			Object.assign(mailer, { isEmailSetUp: true });
			userRepository.findOneBy.mockResolvedValue({
				id: 'user123',
				email: 'user@example.com',
				firstName: 'John',
			} as any);
			mailer.workflowFailure.mockResolvedValue({ emailSent: true });

			eventService.emit('instance-first-production-workflow-failed', baseEvent);

			await flushPromises();

			expect(mailer.workflowFailure).toHaveBeenCalledWith({
				email: 'user@example.com',
				firstName: 'John',
				workflowId: 'workflow123',
				workflowName: 'Test Workflow',
			});
			expect(logger.info).toHaveBeenCalledWith('Sent first production failure email', {
				workflowId: 'workflow123',
				userId: 'user123',
				email: 'user@example.com',
			});
		});

		it('should log error when email sending fails with Error instance', async () => {
			Object.assign(mailer, { isEmailSetUp: true });
			userRepository.findOneBy.mockResolvedValue({
				id: 'user123',
				email: 'user@example.com',
				firstName: 'John',
			} as any);
			const error = new Error('SMTP connection failed');
			mailer.workflowFailure.mockRejectedValue(error);

			eventService.emit('instance-first-production-workflow-failed', baseEvent);

			await flushPromises();

			expect(logger.error).toHaveBeenCalledWith('Failed to send first production failure email', {
				workflowId: 'workflow123',
				userId: 'user123',
				error: 'SMTP connection failed',
			});
		});

		it('should log error when email sending fails with non-Error value', async () => {
			Object.assign(mailer, { isEmailSetUp: true });
			userRepository.findOneBy.mockResolvedValue({
				id: 'user123',
				email: 'user@example.com',
				firstName: 'John',
			} as any);
			mailer.workflowFailure.mockRejectedValue('string error');

			eventService.emit('instance-first-production-workflow-failed', baseEvent);

			await flushPromises();

			expect(logger.error).toHaveBeenCalledWith('Failed to send first production failure email', {
				workflowId: 'workflow123',
				userId: 'user123',
				error: 'string error',
			});
		});
	});

	describe('team-project-shared event', () => {
		const event: RelayEventMap['team-project-shared'] = {
			sharer: mock<User>({ id: 'sharer-1' }),
			newSharees: [{ userId: 'user-1', role: 'project:viewer' }],
			project: { id: 'project-1', name: 'Project' },
		};

		it('sends the project notification', async () => {
			eventService.emit('team-project-shared', event);
			await flushPromises();

			expect(mailer.notifyProjectShared).toHaveBeenCalledWith(event);
		});

		it('logs an error when the notification fails', async () => {
			mailer.notifyProjectShared.mockRejectedValueOnce(new Error('Template failed'));

			eventService.emit('team-project-shared', event);
			await flushPromises();

			expect(logger.error).toHaveBeenCalledWith('Failed to send project shared email', {
				projectId: 'project-1',
				sharerId: 'sharer-1',
				error: 'Template failed',
			});
		});

		it('logs a non-error notification failure', async () => {
			mailer.notifyProjectShared.mockRejectedValueOnce('Template failed');

			eventService.emit('team-project-shared', event);
			await flushPromises();

			expect(logger.error).toHaveBeenCalledWith('Failed to send project shared email', {
				projectId: 'project-1',
				sharerId: 'sharer-1',
				error: 'Template failed',
			});
		});
	});
});
